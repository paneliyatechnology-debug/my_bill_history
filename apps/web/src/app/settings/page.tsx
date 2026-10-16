"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { CreateCompanyModal } from "../../components/tenants/create-company-modal";
import { INDIAN_STATES } from "@billing/shared-types";

export default function SettingsPage() {
  const {
    lang,
    tenantContext,
    companies,
    currentCompany,
    switchCompany,
    entitlements,
    refreshTenantMetadata,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "companies">("profile");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSwitchingId, setIsSwitchingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    legalName: "",
    tradeName: "",
    gstin: "",
    pan: "",
    stateCode: "24",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    pincode: "",
    phone: "",
    email: "",
    bankName: "",
    bankAccountNo: "",
    bankIfsc: "",
    bankBranch: "",
    upiVpa: "",
    enableGujaratiPrint: true,
    allowNegativeStock: false,
  });

  useEffect(() => {
    async function loadCompany() {
      setIsLoading(true);
      try {
        const res: any = await apiClient.get("/tenants/company");
        if (res) {
          setFormData({
            legalName: res.legalName || "",
            tradeName: res.tradeName || "",
            gstin: res.gstin || "",
            pan: res.pan || "",
            stateCode: res.stateCode || "24",
            addressLine1: res.addressLine1 || "",
            addressLine2: res.addressLine2 || "",
            city: res.city || "",
            district: res.district || "",
            pincode: res.pincode || "",
            phone: res.phone || "",
            email: res.email || "",
            bankName: res.bankName || "",
            bankAccountNo: res.bankAccountNo || "",
            bankIfsc: res.bankIfsc || "",
            bankBranch: res.bankBranch || "",
            upiVpa: res.upiVpa || "",
            enableGujaratiPrint: res.enableGujaratiPrint ?? true,
            allowNegativeStock: res.allowNegativeStock ?? false,
          });
        }
      } catch (err: any) {
        setMessage({
          type: "error",
          text: err.message || "Failed to load company details.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (tenantContext.companyId) {
      loadCompany();
    }
  }, [tenantContext.companyId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await apiClient.patch("/tenants/company", formData);
      setMessage({
        type: "success",
        text:
          lang === "gu"
            ? "કંપની સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવી."
            : "Company settings saved successfully.",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to update company settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        {lang === "gu"
          ? "સેટિંગ્સ લોડ થઈ રહ્યાં છે..."
          : "Loading company settings..."}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Page Title & Navigation Tabs */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold text-[#202124] tracking-tight leading-tight">
              {lang === "gu"
                ? "કંપની પ્રોફાઇલ અને વ્યવસાય સંચાલન"
                : "Company Profile & Multi-Business Management"}
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-1 leading-relaxed break-words font-normal">
              {lang === "gu"
                ? "કાયદેસર માહિતી, જીએસટી, મલ્ટી-કંપની સેટિંગ્સ અને બિલિંગ પસંદગીઓ"
                : "Legal details, GSTIN, multi-company entitlements, and business preferences"}
            </p>
          </div>

          {/* Quick Action in Header */}
          {activeTab === "companies" && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#F47721] hover:bg-[#E06612] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Company</span>
            </button>
          )}
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-200 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === "profile"
                ? "border-[#F47721] text-[#F47721]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {lang === "gu" ? "સક્રિય કંપની પ્રોફાઇલ (Active Profile)" : "Active Company Profile"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "companies"
                ? "border-[#F47721] text-[#F47721]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>{lang === "gu" ? "તમામ પેઢીઓ (All Companies)" : "All Businesses"}</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
              {companies.length}
            </span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {activeTab === "profile" && (
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Business Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            {lang === "gu"
              ? "મૂળભૂત વેપાર વિગતો (Business Profile)"
              : "Business Profile"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "કાયદેસર નામ (Legal Name) *" : "Legal Name *"}
              </label>
              <input
                type="text"
                name="legalName"
                value={formData.legalName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "વેપારી નામ (Trade Name) *" : "Trade Name *"}
              </label>
              <input
                type="text"
                name="tradeName"
                value={formData.tradeName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "જીએસટી નંબર (GSTIN)" : "GSTIN (15 Digits)"}
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="24AAACA0000A1Z5"
                maxLength={15}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "રાજ્ય કોડ (State Code)" : "State Code"}
              </label>
              <input
                type="text"
                name="stateCode"
                value={formData.stateCode}
                onChange={handleChange}
                maxLength={2}
                placeholder="24"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "ફોન નંબર" : "Phone Number"}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "ઈમેલ સરનામું" : "Email Address"}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            {lang === "gu" ? "સરનામું (Address)" : "Registered Address"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "સરનામું લાઇન ૧" : "Address Line 1"}
              </label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "શહેર / ગામ" : "City"}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "પીનકોડ" : "Pincode"}
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                maxLength={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bank & UPI Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            {lang === "gu"
              ? "બેંક અને યુપીઆઇ વિગતો (Bank & Payment Details)"
              : "Bank & Payment Details"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "બેંકનું નામ" : "Bank Name"}
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="State Bank of India"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "બેંક ખાતા નંબર" : "Bank Account Number"}
              </label>
              <input
                type="text"
                name="bankAccountNo"
                value={formData.bankAccountNo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "IFSC કોડ" : "IFSC Code"}
              </label>
              <input
                type="text"
                name="bankIfsc"
                value={formData.bankIfsc}
                onChange={handleChange}
                placeholder="SBIN0001234"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu"
                  ? "UPI VPA (ક્યૂઆર કોડ માટે)"
                  : "UPI VPA (For Dynamic QR)"}
              </label>
              <input
                type="text"
                name="upiVpa"
                value={formData.upiVpa}
                onChange={handleChange}
                placeholder="merchant@okaxis"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* System & Printing Preferences */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            {lang === "gu"
              ? "બિલિંગ પસંદગીઓ (Preferences)"
              : "Billing Preferences"}
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="enableGujaratiPrint"
                checked={formData.enableGujaratiPrint}
                onChange={handleChange}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary/20 accent-primary"
              />
              <span className="text-sm text-slate-800 font-medium">
                {lang === "gu"
                  ? "બિલ પ્રિન્ટિંગમાં ગુજરાતી નામ દર્શાવો (Bilingual Gujarati Print)"
                  : "Enable bilingual Gujarati printing on invoices"}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="allowNegativeStock"
                checked={formData.allowNegativeStock}
                onChange={handleChange}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary/20 accent-primary"
              />
              <span className="text-sm text-slate-800 font-medium">
                {lang === "gu"
                  ? "નેગેટિવ સ્ટોક વેચાણની મંજૂરી આપો (Allow Negative Stock)"
                  : "Allow negative inventory sales"}
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-card hover:shadow-hover"
          >
            {isSaving
              ? lang === "gu"
                ? "સાચવી રહ્યું છે..."
                : "Saving..."
              : lang === "gu"
                ? "ફેરફારો સાચવો (Save Changes)"
                : "Save Changes"}
          </button>
        </div>
      </form>
      )}

      {/* MULTI-COMPANY MANAGEMENT TAB */}
      {activeTab === "companies" && (
        <div className="space-y-6">
          {/* Subscription Plan Entitlements Banner */}
          <div className="bg-gradient-to-r from-[#FFFAF5] via-white to-orange-50/30 p-6 rounded-2xl border border-[#FED7AA] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#F47721] text-white">
                    {entitlements?.name || "Standard Plan"}
                  </span>
                  <span className="text-xs font-semibold text-[#667085]">
                    {entitlements?.tier || "ACTIVE"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#202124]">
                  {lang === "gu" ? "સબ્સ્ક્રિપ્શન અધિકારો (Plan Entitlements)" : "Subscription & Company Entitlements"}
                </h3>
                <p className="text-xs text-[#667085]">
                  {lang === "gu"
                    ? `તમારી યોજના હેઠળ ${entitlements?.currentCount || companies.length} માંથી ${entitlements?.maxCompanies || 1} પેઢીઓ સક્રિય છે.`
                    : `Your organization currently has ${entitlements?.currentCount || companies.length} of ${entitlements?.maxCompanies || 1} permitted companies active.`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black text-[#F47721]">
                    {entitlements?.currentCount || companies.length} / {entitlements?.maxCompanies || 1}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    Companies Utilized
                  </div>
                </div>

                {entitlements?.canAddCompany ? (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-[#F47721] hover:bg-[#E06612] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Company</span>
                  </button>
                ) : (
                  <div className="text-right">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold inline-block">
                      Plan Limit Reached
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Feature Tags */}
            <div className="mt-4 pt-4 border-t border-[#FED7AA]/50 flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-0.5 bg-white border border-[#FED7AA] text-slate-700 rounded-md font-medium">
                Max {entitlements?.maxBranchesPerCompany || 1} Branches / Company
              </span>
              <span className="px-2 py-0.5 bg-white border border-[#FED7AA] text-slate-700 rounded-md font-medium">
                Max {entitlements?.maxUsers || 2} Users
              </span>
              {entitlements?.features?.posCounter && (
                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md font-medium">
                  POS Counter Enabled
                </span>
              )}
              {entitlements?.features?.eInvoiceEWay && (
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md font-medium">
                  E-Invoice & E-Way Bill
                </span>
              )}
            </div>
          </div>

          {/* Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((c) => {
              const isSelected = c.id === currentCompany?.id;
              const isSwitching = isSwitchingId === c.id;

              return (
                <div
                  key={c.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? "bg-white border-[#F47721] ring-2 ring-[#F47721]/20 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                  } flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isSelected
                              ? "bg-[#FFF3E8] text-[#F47721] border border-[#FED7AA]"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {c.tradeName || c.legalName}
                          </h4>
                          {c.legalName && c.legalName !== c.tradeName && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {c.legalName}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="px-2.5 py-0.5 bg-[#FFF3E8] border border-[#FED7AA] text-[#F47721] rounded-md text-[10px] font-bold shrink-0">
                          Active Context
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          GSTIN
                        </span>
                        <span className="font-mono font-medium text-slate-800">
                          {c.gstin || "Unregistered"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          State / City
                        </span>
                        <span className="font-medium text-slate-800">
                          {c.city ? `${c.city}, ` : ""}{c.stateCode ? (INDIAN_STATES[c.stateCode]?.name || c.stateCode) : "Gujarat"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSelected) {
                          setIsSwitchingId(c.id);
                          switchCompany(c.id).finally(() => {
                            setIsSwitchingId(null);
                            setActiveTab("profile");
                          });
                        } else {
                          setActiveTab("profile");
                        }
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Edit Profile & Settings
                    </button>

                    {!isSelected && (
                      <button
                        type="button"
                        disabled={isSwitching}
                        onClick={async () => {
                          setIsSwitchingId(c.id);
                          try {
                            await switchCompany(c.id);
                          } finally {
                            setIsSwitchingId(null);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        {isSwitching ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Switching...</span>
                          </>
                        ) : (
                          <span>Switch to this Business</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal for creating new company */}
      <CreateCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          refreshTenantMetadata();
        }}
      />
    </div>
  );
}
