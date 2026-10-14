"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";

export default function SettingsPage() {
  const { lang, tenantContext } = useAuth();
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
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {lang === "gu"
            ? "કંપની પ્રોફાઇલ અને સેટિંગ્સ"
            : "Company Profile & Settings"}
        </h1>
        <p className="text-xs text-slate-500">
          {lang === "gu"
            ? "કાયદેસર માહિતી, જીએસટી, સરનામું, બેંક વિગતો અને બિલિંગ પસંદગીઓ"
            : "Legal details, GSTIN, address, bank details, and invoice printing preferences"}
        </p>
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
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-800 font-medium">
                {lang === "gu"
                  ? "બિલ પ્રિન્ટિંગમાં ગુજરાતી નામ દર્શાવો (Bilingual Print)"
                  : "Enable bilingual Gujarati printing on invoices"}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="allowNegativeStock"
                checked={formData.allowNegativeStock}
                onChange={handleChange}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
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
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
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
    </div>
  );
}
