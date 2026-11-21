"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, useCanWriteGst } from "../../../components/gst/gst-kit";
import { CustomSelect } from "@/components/ui/dropdown-system";
import {
  Building2,
  Sliders,
  Server,
  Truck,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Radio,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function validateGstinChecksum(gstin: string): { valid: boolean; message?: string } {
  const clean = (gstin || "").trim().toUpperCase();
  if (!clean) return { valid: true };
  if (clean.length !== 15) return { valid: false, message: "GSTIN must be exactly 15 alphanumeric characters." };
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(clean)) return { valid: false, message: "Invalid GSTIN format (e.g. 24AABCU9603R1ZM)." };

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = GSTIN_CHARSET.indexOf(clean[i]);
    if (val === -1) return { valid: false, message: "Invalid characters in GSTIN." };
    const weight = i % 2 === 0 ? 1 : 2;
    const product = val * weight;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const remainder = sum % 36;
  const checkCode = (36 - remainder) % 36;
  const expectedChar = GSTIN_CHARSET[checkCode];
  if (expectedChar !== clean[14]) {
    return { valid: false, message: `Invalid checksum digit '${clean[14]}'. Expected '${expectedChar}'.` };
  }
  return { valid: true };
}

export default function GstSettingsPage() {
  return (
    <GstFrame
      title="GST Settings & Statutory Configuration"
      notice="Manage enterprise GSTIN registration, return filing frequency, tax preferences, and Government IRP / E-Way Bill API credentials."
    >
      <Body />
    </GstFrame>
  );
}

function Body() {
  const { currentCompany, tenantContext, refreshTenantMetadata } = useAuth();
  const canWrite = useCanWriteGst();

  // 1. Business GST Registration State
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("24");
  const [gstType, setGstType] = useState("REGULAR");
  const [filingFrequency, setFilingFrequency] = useState("MONTHLY");
  const [compositionScheme, setCompositionScheme] = useState(false);
  const [eInvoiceApplicable, setEInvoiceApplicable] = useState(false);

  // 2. GST Preferences State
  const [taxInclusivePricing, setTaxInclusivePricing] = useState(false);
  const [rcmEnabled, setRcmEnabled] = useState(true);
  const [hsnMandatoryDigits, setHsnMandatoryDigits] = useState("6");
  const [defaultPosRule, setDefaultPosRule] = useState("BUYER_BILLING_ADDRESS");

  // 3. E-Invoice Integration State
  const [environment, setEnvironment] = useState<"PRODUCTION" | "SANDBOX">("PRODUCTION");
  const [irpProvider, setIrpProvider] = useState("NIC_IRP");
  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [password, setPassword] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  // 4. E-Way Bill Integration State
  const [ewayProvider, setEwayProvider] = useState("NIC_EWAY");
  const [ewayClientId, setEwayClientId] = useState("");
  const [ewayUsername, setEwayUsername] = useState("");
  const [ewayClientSecret, setEwayClientSecret] = useState("");
  const [ewayPassword, setEwayPassword] = useState("");
  const [showEwaySecret, setShowEwaySecret] = useState(false);

  // Status & Feedback
  const [credentialStatus, setCredentialStatus] = useState<string>("CREDENTIALS_UNAVAILABLE");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.get<any>("/gst/integration");
      if (res.company) {
        setLegalName(res.company.legalName || "");
        setTradeName(res.company.tradeName || "");
        setGstin(res.company.gstin || "");
        setStateCode(res.company.stateCode || "24");
        setGstType(res.company.gstType || "REGULAR");
        setCompositionScheme(Boolean(res.company.compositionScheme));
        setEInvoiceApplicable(Boolean(res.company.eInvoiceApplicable));
      } else if (currentCompany) {
        setLegalName(currentCompany.legalName || "");
        setTradeName(currentCompany.tradeName || "");
        setGstin(currentCompany.gstin || "");
        setStateCode(currentCompany.stateCode || "24");
      }

      setEnvironment(res.environment || "PRODUCTION");
      setClientId(res.einvoiceClientId || "");
      setUsername(res.einvoiceUsername || "");
      setEwayClientId(res.ewayClientId || "");
      setEwayUsername(res.ewayUsername || "");
      setCredentialStatus(res.credentialStatus || "CREDENTIALS_UNAVAILABLE");
      setStatusMessage(res.message || "");
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load GST settings." });
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, currentCompany]);

  useEffect(() => {
    load();
  }, [load]);

  const gstinValidation = validateGstinChecksum(gstin);

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    if (clean.length >= 2) {
      const prefix = clean.slice(0, 2);
      if (/^[0-9]{2}$/.test(prefix)) {
        setStateCode(prefix);
      }
    }
  };

  const saveSettings = async () => {
    if (gstin && !gstinValidation.valid) {
      setFeedback({ type: "error", text: gstinValidation.message || "Invalid GSTIN." });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const payload: any = {
        legalName,
        tradeName,
        gstin,
        stateCode,
        gstType,
        compositionScheme,
        eInvoiceApplicable,
        environment,
        productionEnabled: environment === "PRODUCTION",
        einvoiceClientId: clientId || null,
        einvoiceUsername: username || null,
        ewayClientId: ewayClientId || null,
        ewayUsername: ewayUsername || null,
      };

      // Only pass secrets if user explicitly entered them to prevent overwriting with blanks
      if (clientSecret) payload.clientSecret = clientSecret;
      if (password) payload.password = password;
      if (ewayClientSecret) payload.ewayClientSecret = ewayClientSecret;
      if (ewayPassword) payload.ewayPassword = ewayPassword;

      const saved = await apiClient.put<any>("/gst/integration", payload);

      // Refresh tenant metadata immediately so GstFrame header and context update live
      await refreshTenantMetadata();

      setFeedback({
        type: "success",
        text: `GST settings successfully updated! Environment: ${saved.environment}. Status: ${saved.credentialStatus}`,
      });
      await load();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to save GST configuration." });
    } finally {
      setSaving(false);
    }
  };

  const handleLivePing = async () => {
    setPinging(true);
    setFeedback(null);
    try {
      const result = await apiClient.post<any>("/gst/integration/live-ping");
      if (result.outcome === "REACHABLE") {
        setFeedback({
          type: "success",
          text: `Live Ping Succeeded: ${result.message}`,
        });
      } else {
        setFeedback({
          type: "error",
          text: `Live Ping: ${result.outcome} — ${result.message || "Heartbeat failed."}`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Connection check failed." });
    } finally {
      setPinging(false);
    }
  };

  return (
    <Panel
      loading={loading}
      error={null}
      onRetry={load}
      empty={!tenantContext.companyId ? "Sign in and select a company before configuring GST." : null}
    >
      <div className="w-full space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span>{feedback.text}</span>
            <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-3">
              ✕
            </button>
          </div>
        )}

        {/* Action Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">GST Statutory Configuration</h2>
              <p className="text-xs text-slate-500">
                Company: <span className="font-semibold text-slate-700">{legalName || currentCompany?.legalName || "My Business"}</span>
                {gstin ? ` · GSTIN: ${gstin}` : " · (Unregistered/Not set)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={pinging}
              onClick={handleLivePing}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <Radio className={`w-3.5 h-3.5 ${pinging ? "animate-pulse text-[#1677E8]" : "text-slate-500"}`} />
              <span>{pinging ? "Checking..." : "Test IRP Ping"}</span>
            </button>

            {canWrite && (
              <button
                type="button"
                disabled={saving}
                onClick={saveSettings}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#1677E8] hover:bg-[#1268D3] text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save GST Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Desktop Grid for Sections 1 & 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 1: BUSINESS GST REGISTRATION */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-[#1677E8]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Business GST Registration
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Legal Business Name</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Acme Private Limited"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trade Name (Brand / Store)</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="e.g. Acme Enterprises"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company GSTIN
                    {gstin && !gstinValidation.valid && (
                      <span className="text-rose-600 font-normal ml-2 text-[10px]">{gstinValidation.message}</span>
                    )}
                    {gstin && gstinValidation.valid && (
                      <span className="text-emerald-600 font-normal ml-2 text-[10px]">✓ Valid Checksum</span>
                    )}
                  </label>
                  <input
                    className={`w-full font-mono uppercase border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 h-9 ${
                      gstin && !gstinValidation.valid
                        ? "border-rose-300 bg-rose-50/30 text-rose-800 focus:ring-rose-200"
                        : "border-slate-300 text-slate-900 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
                    }`}
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="24AABCU9603R1ZM"
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State Code</label>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="24"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registration Type</label>
                  <CustomSelect
                    size="sm"
                    value={gstType}
                    onChange={(val: any) => setGstType(val)}
                    options={[
                      { value: "REGULAR", label: "Regular Taxpayer" },
                      { value: "COMPOSITION", label: "Composition Scheme" },
                      { value: "SEZ_DEVELOPER", label: "SEZ Developer" },
                      { value: "SEZ_UNIT", label: "SEZ Unit" },
                      { value: "ISD", label: "Input Service Distributor" },
                      { value: "UNREGISTERED", label: "Unregistered Entity" },
                    ]}
                    triggerClassName="rounded-xl border-slate-300 h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Return Frequency</label>
                  <CustomSelect
                    size="sm"
                    value={filingFrequency}
                    onChange={(val: any) => setFilingFrequency(val)}
                    options={[
                      { value: "MONTHLY", label: "Monthly (Standard)" },
                      { value: "QUARTERLY_QRMP", label: "Quarterly (QRMP Scheme)" },
                    ]}
                    triggerClassName="rounded-xl border-slate-300 h-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={compositionScheme}
                    onChange={(e) => setCompositionScheme(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1677E8] focus:ring-[#1677E8]"
                  />
                  <span>Opted for Composition Scheme under Section 10</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={eInvoiceApplicable}
                    onChange={(e) => setEInvoiceApplicable(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1677E8] focus:ring-[#1677E8]"
                  />
                  <span>E-Invoice Mandate Applicable (Aggregate Turnover &gt; ₹5 Cr)</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: GST PREFERENCES */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-[#1677E8]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. GST Calculation Preferences
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pricing Tax Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTaxInclusivePricing(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      !taxInclusivePricing
                        ? "bg-blue-50 border-[#1677E8] text-[#1677E8]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Tax Exclusive (Base + Tax)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxInclusivePricing(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      taxInclusivePricing
                        ? "bg-blue-50 border-[#1677E8] text-[#1677E8]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Tax Inclusive (MRP)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">HSN/SAC Code Requirement</label>
                <CustomSelect
                  size="sm"
                  value={hsnMandatoryDigits}
                  onChange={(val: any) => setHsnMandatoryDigits(val)}
                  options={[
                    { value: "4", label: "4 Digits (Turnover up to ₹5 Cr - B2B mandatory)" },
                    { value: "6", label: "6 Digits (Turnover &gt; ₹5 Cr - All supplies mandatory)" },
                    { value: "8", label: "8 Digits (Export / Import tariff lines)" },
                  ]}
                  triggerClassName="rounded-xl border-slate-300 h-9"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Place of Supply Rule</label>
                <CustomSelect
                  size="sm"
                  value={defaultPosRule}
                  onChange={(val: any) => setDefaultPosRule(val)}
                  options={[
                    { value: "BUYER_BILLING_ADDRESS", label: "Buyer's Registered Billing State (Default)" },
                    { value: "GOODS_DELIVERY_DESTINATION", label: "Destination / Shipping State (Goods Supply)" },
                    { value: "SERVICE_LOCATION", label: "Location of Service Performance" },
                  ]}
                  triggerClassName="rounded-xl border-slate-300 h-9"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={rcmEnabled}
                    onChange={(e) => setRcmEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1677E8] focus:ring-[#1677E8]"
                  />
                  <span>Enable Reverse Charge Mechanism (RCM) Tracking on inward supplies</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Desktop Grid for Sections 3 & 4 (E-Invoice & E-Way Bill) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 3: E-INVOICE INTEGRATION */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. E-Invoice IRP Integration
                </h3>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  credentialStatus === "READY"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {credentialStatus === "READY" ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-amber-600" />}
                {credentialStatus}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Environment</label>
                  <CustomSelect
                    size="sm"
                    value={environment}
                    onChange={(val: any) => setEnvironment(val)}
                    options={[
                      { value: "PRODUCTION", label: "Production (Live IRP)" },
                      { value: "SANDBOX", label: "Sandbox (Testing)" },
                    ]}
                    triggerClassName="rounded-xl border-slate-300 h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IRP Provider</label>
                  <CustomSelect
                    size="sm"
                    value={irpProvider}
                    onChange={(val: any) => setIrpProvider(val)}
                    options={[
                      { value: "NIC_IRP", label: "NIC Official IRP (einv-apis.nic.in)" },
                      { value: "CYGNET", label: "Cygnet GSP Gateway" },
                      { value: "MASTERS_INDIA", label: "Masters India GSP" },
                    ]}
                    triggerClassName="rounded-xl border-slate-300 h-9"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">IRP Client ID</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. NIC-IRP-CLIENT-01"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">IRP Username</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. IRP_USER_9603"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client Secret (Encrypted)</label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9 pr-8"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IRP Password</label>
                  <input
                    type="password"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: E-WAY BILL INTEGRATION */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#1677E8]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  4. E-Way Bill Gateway Integration
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                API Level 2.0
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Provider</label>
                  <CustomSelect
                    size="sm"
                    value={ewayProvider}
                    onChange={(val: any) => setEwayProvider(val)}
                    options={[
                      { value: "NIC_EWAY", label: "NIC E-Way Portal" },
                      { value: "CDAC", label: "C-DAC Government Gateway" },
                    ]}
                    triggerClassName="rounded-xl border-slate-300 h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Way Bill Client ID</label>
                  <input
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                    value={ewayClientId}
                    onChange={(e) => setEwayClientId(e.target.value)}
                    placeholder="Optional separate EWB client"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-Way Bill Username</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                  value={ewayUsername}
                  onChange={(e) => setEwayUsername(e.target.value)}
                  placeholder="e.g. EWB_USER_9603"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Way Secret</label>
                  <div className="relative">
                    <input
                      type={showEwaySecret ? "text" : "password"}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9 pr-8"
                      value={ewayClientSecret}
                      onChange={(e) => setEwayClientSecret(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEwaySecret(!showEwaySecret)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showEwaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Way Password</label>
                  <input
                    type="password"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] h-9"
                    value={ewayPassword}
                    onChange={(e) => setEwayPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: RETURN CONFIGURATION & STATUTORY DEADLINES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <FileCheck2 className="w-4 h-4 text-[#1677E8]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              5. Statutory Return Filing Configuration
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">GSTR-1 (Outward Supplies)</span>
              <p className="text-slate-600 text-[11px]">Due on the 11th of every month (or 13th for QRMP quarterly taxpayers).</p>
              <span className="inline-block px-2 py-0.5 bg-blue-100 text-[#1677E8] font-bold text-[10px] rounded">
                Active Schedule: Monthly
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">GSTR-3B (Summary Return)</span>
              <p className="text-slate-600 text-[11px]">Due on the 20th of every month with mandatory Rule 88A set-off before filing.</p>
              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                Automatic Set-Off Enabled
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">GSTR-2B Auto-Reconciliation</span>
              <p className="text-slate-600 text-[11px]">Generated on the 14th of each month. Requires manual accountant sign-off per Sec 16(2)(aa).</p>
              <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded">
                Section 16(2)(aa) Guard Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
