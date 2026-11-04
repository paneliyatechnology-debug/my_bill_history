"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { einvoiceApi, EInvoiceSettingsData } from "@/lib/einvoice";

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RefreshIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ServerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export default function EInvoiceSettingsPage() {
  const { tenantContext, currentCompany, lang, refreshTenantMetadata } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);
  const [isApplicable, setIsApplicable] = useState(!!currentCompany?.eInvoiceApplicable);

  // Form State
  const [settings, setSettings] = useState<EInvoiceSettingsData>({
    environment: "PRODUCTION",
    productionEnabled: true,
    einvoiceClientId: "",
    einvoiceUsername: "",
    ewayClientId: "",
    ewayUsername: "",
    credentialStatus: "MISSING",
    secretsPresent: false,
    message: "",
  });

  const [clientSecret, setClientSecret] = useState("");
  const [password, setPassword] = useState("");
  const [ewayClientSecret, setEwayClientSecret] = useState("");
  const [ewayPassword, setEwayPassword] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("https://api.einvoice1.gst.gov.in");

  // Show/Hide password toggles
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEwaySecret, setShowEwaySecret] = useState(false);
  const [showEwayPassword, setShowEwayPassword] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      if (!tenantContext.companyId) return;
      setLoading(true);
      try {
        const res = await einvoiceApi.getSettings();
        setSettings({
          ...res,
          environment: "PRODUCTION",
          productionEnabled: true,
        });
        if (res.einvoiceBaseUrl) {
          setCustomBaseUrl(res.einvoiceBaseUrl);
        }
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

      const payload: any = {
        environment: "PRODUCTION",
        productionEnabled: true,
        einvoiceClientId: settings.einvoiceClientId?.trim() || undefined,
        einvoiceUsername: settings.einvoiceUsername?.trim() || undefined,
        ewayClientId: settings.ewayClientId?.trim() || undefined,
        ewayUsername: settings.ewayUsername?.trim() || undefined,
        einvoiceBaseUrl: customBaseUrl.trim() || "https://api.einvoice1.gst.gov.in",
      };

      if (clientSecret.trim()) payload.clientSecret = clientSecret.trim();
      if (password.trim()) payload.password = password.trim();
      if (ewayClientSecret.trim()) payload.ewayClientSecret = ewayClientSecret.trim();
      if (ewayPassword.trim()) payload.ewayPassword = ewayPassword.trim();

      const res = await einvoiceApi.saveSettings(payload);
      setFeedback({ type: "success", text: res.message || "Production IRP settings saved and encrypted successfully." });

      // Clear plain inputs for security
      setClientSecret("");
      setPassword("");
      setEwayClientSecret("");
      setEwayPassword("");

      // Refresh settings
      const updated = await einvoiceApi.getSettings();
      setSettings({
        ...updated,
        environment: "PRODUCTION",
        productionEnabled: true,
      });
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const res = await einvoiceApi.testLiveConnection();
      setPingResult(res);
    } catch (err: any) {
      setPingResult({ attempted: true, outcome: "ERROR", message: err.message || "Connection check failed" });
    } finally {
      setTestingPing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-600">Loading IRP live configuration...</span>
        </div>
      </div>
    );
  }

  const isConfigReady = settings.credentialStatus === "READY" || (settings.einvoiceClientId && (settings.secretsPresent || clientSecret));

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
          <h1 className="text-[22px] font-semibold text-[#182230]">
            {lang === "gu" ? "ઈ-ઇનવોઇસ અને IRP લાઈવ સેટિંગ્સ" : "E-Invoice & IRP Provider Configuration"}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Official NIC Invoice Registration Portal (IRP) live credentials, AES-256-GCM encryption, and government compliance setup.
          </p>
        </div>

        <Link
          href="/sales/e-invoices"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          ← Back to E-Invoices
        </Link>
      </div>

      {feedback && (
        <div
          className={`mb-6 rounded-xl border p-4 text-xs font-semibold flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          {feedback.type === "success" ? <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircleIcon className="h-4 w-4 text-rose-600 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Company GST Registration Identity */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-700">1</span>
              Company GSTIN Identity
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Company Legal Name</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 font-bold text-slate-800">
                  {settings.company?.legalName || currentCompany?.legalName || "Not configured"}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Registered GSTIN</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 tabular-nums font-bold text-emerald-800">
                  {settings.company?.gstin || currentCompany?.gstin || "No GSTIN on file"}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">State Code</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 tabular-nums text-slate-700">
                  {settings.company?.stateCode || currentCompany?.stateCode || "24"}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Registered Pincode</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 tabular-nums text-slate-700">
                  {settings.company?.pincode || currentCompany?.pincode || "Not set"}
                </div>
              </div>

              {/* Dynamic E-Invoicing Applicable Toggle */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <label className="block font-medium text-slate-800 text-[12px]">Enable Statutory E-Invoicing for this Company</label>
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-700">2</span>
              Government IRP Credentials & API Setup
            </h2>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">IRP / GSP Integration Provider</label>
                  <div className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-slate-50 text-slate-700 font-medium">
                    NIC GST Invoice Registration Portal (Authorized Adapter)
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Direct integration via authorized Government IRP v1.04 API specifications.</p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Operating Environment</label>
                  <div className="w-full rounded-lg border border-emerald-300 bg-emerald-50/70 p-2 text-xs font-bold text-emerald-900 flex items-center justify-between">
                    <span>Government Portal Live (Production)</span>
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">LIVE</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700">Connected to official Government GST Portal (api.einvoice1.gst.gov.in).</p>
                </div>
              </div>

              {/* Base Gateway URL */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Government IRP Base URL</label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.einvoice1.gst.gov.in"
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                />
                <p className="mt-1 text-[11px] text-slate-400">Default: https://api.einvoice1.gst.gov.in (IRP Portal 1) or your authorized GSP gateway URL.</p>
              </div>

              {/* Credentials Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    E-Invoice API Client ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.einvoiceClientId || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, einvoiceClientId: e.target.value }))}
                    placeholder="e.g. NIC Client ID"
                    required
                    className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    E-Invoice Portal Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.einvoiceUsername || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, einvoiceUsername: e.target.value }))}
                    placeholder="IRP API username"
                    required
                    className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    E-Invoice Client Secret {settings.secretsPresent && <span className="text-emerald-700 font-normal">(Stored & Encrypted)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showClientSecret ? "text" : "password"}
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder={settings.secretsPresent ? "•••••••••••••••• (leave blank to keep current)" : "Enter IRP Client Secret"}
                      className="w-full rounded-lg border border-slate-300 p-2 pr-9 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showClientSecret ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    E-Invoice Portal Password {settings.secretsPresent && <span className="text-emerald-700 font-normal">(Stored & Encrypted)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={settings.secretsPresent ? "•••••••••••••••• (leave blank to keep current)" : "Enter IRP Portal Password"}
                      className="w-full rounded-lg border border-slate-300 p-2 pr-9 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">E-Way Bill API Client ID (Optional)</label>
                  <input
                    type="text"
                    value={settings.ewayClientId || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, ewayClientId: e.target.value }))}
                    placeholder="E-Way client ID (defaults to E-Invoice Client ID)"
                    className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">E-Way Bill Portal Username (Optional)</label>
                  <input
                    type="text"
                    value={settings.ewayUsername || ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, ewayUsername: e.target.value }))}
                    placeholder="E-Way API username (defaults to E-Invoice Username)"
                    className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">E-Way Bill Client Secret (Optional)</label>
                  <div className="relative">
                    <input
                      type={showEwaySecret ? "text" : "password"}
                      value={ewayClientSecret}
                      onChange={(e) => setEwayClientSecret(e.target.value)}
                      placeholder="E-Way Client Secret (optional)"
                      className="w-full rounded-lg border border-slate-300 p-2 pr-9 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEwaySecret(!showEwaySecret)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showEwaySecret ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">E-Way Bill Portal Password (Optional)</label>
                  <div className="relative">
                    <input
                      type={showEwayPassword ? "text" : "password"}
                      value={ewayPassword}
                      onChange={(e) => setEwayPassword(e.target.value)}
                      placeholder="E-Way Portal Password (optional)"
                      className="w-full rounded-lg border border-slate-300 p-2 pr-9 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEwayPassword(!showEwayPassword)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showEwayPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Secrets Security Note */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-[11px] text-slate-700 flex items-start gap-2.5">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900">Enterprise Security Architecture: </span>
                  All client secrets and passwords entered here are immediately encrypted with <b className="font-semibold text-emerald-800">AES-256-GCM</b> cryptographic envelopes before persistence in the PostgreSQL database. Plaintext credentials are never stored or logged.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Status & Diagnostic Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 text-[15px] border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Connection Status</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE
              </span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Credential Status:</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${
                    isConfigReady
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isConfigReady ? "LIVE & READY" : "CREDENTIALS REQUIRED"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Backend Secrets Present:</span>
                <span className="tabular-nums font-semibold text-slate-800">
                  {settings.secretsPresent ? "YES (AES-256-GCM)" : "NOT CONFIGURED"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Environment Mode:</span>
                <span className="tabular-nums font-semibold text-emerald-700">
                  PRODUCTION (LIVE)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">IRP Host:</span>
                <span className="tabular-nums text-[10px] text-slate-600 truncate max-w-[180px]">
                  api.einvoice1.gst.gov.in
                </span>
              </div>
            </div>

            {/* Test Connection Action */}
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingPing}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50/70 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                {testingPing ? (
                  <>
                    <RefreshIcon className="h-3.5 w-3.5 animate-spin" />
                    <span>Connecting to Government IRP...</span>
                  </>
                ) : (
                  <>
                    <ServerIcon className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Test Live IRP Connection</span>
                  </>
                )}
              </button>

              {pingResult && (
                <div
                  className={`mt-2 rounded p-2.5 text-[11px] ${
                    pingResult.outcome === "REACHABLE"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-amber-50 text-amber-900 border border-amber-200"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {pingResult.outcome === "REACHABLE" ? (
                      <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <AlertCircleIcon className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span>Status: {pingResult.outcome}</span>
                    {pingResult.status && <span className="tabular-nums text-[10px]">({pingResult.status})</span>}
                  </div>
                  <div className="text-[10px] mt-1 leading-normal">{pingResult.message}</div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#1677E8] py-2.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#1268D3] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshIcon className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Live Credentials...</span>
                </>
              ) : (
                <span>Save Live Credentials</span>
              )}
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
