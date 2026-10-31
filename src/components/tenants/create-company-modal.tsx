"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/auth-context";
import { INDIAN_STATES } from "@billing/shared-types";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdCompany: any) => void;
}

export function CreateCompanyModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCompanyModalProps) {
  const { entitlements, createCompany, lang } = useAuth();

  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [stateCode, setStateCode] = useState("24"); // Default Gujarat
  const [city, setCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-extract PAN and State Code when GSTIN is typed
  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(0, 15);
    setGstin(val);

    if (val.length >= 2) {
      const code = val.slice(0, 2);
      if (INDIAN_STATES[code]) {
        setStateCode(code);
      }
    }

    if (val.length >= 12) {
      const extractedPan = val.slice(2, 12);
      setPan(extractedPan);
    }
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPan(e.target.value.toUpperCase().slice(0, 10));
  };

  const resetForm = () => {
    setTradeName("");
    setLegalName("");
    setGstin("");
    setPan("");
    setStateCode("24");
    setCity("");
    setAddressLine1("");
    setPincode("");
    setPhone("");
    setEmail("");
    setError(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canAdd = entitlements?.canAddCompany ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tradeName.trim()) {
      setError(lang === "gu" ? "વેપાર નામ જરૂરી છે." : "Business / Trade Name is required.");
      return;
    }

    if (!canAdd) {
      setError(
        `Subscription plan limit reached (${entitlements?.currentCount || 0}/${
          entitlements?.maxCompanies || 1
        } companies). Please upgrade your plan to add more businesses.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tradeName: tradeName.trim(),
        legalName: legalName.trim() || tradeName.trim(),
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
        stateCode,
        city: city.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        pincode: pincode.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      };

      const result = await createCompany(payload);
      onClose();
      if (onSuccess) {
        onSuccess(result?.company);
      }
    } catch (err: any) {
      const msg =
        err?.messageGujarati ||
        err?.message ||
        "Failed to create business. Please verify details and try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isSubmitting) onClose();
      }}
    >
      <div className="fixed inset-0 bg-transparent" onClick={() => !isSubmitting && onClose()} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-[#D1D5DB] flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#FFFAF5] to-white border-b border-[#BCEADF]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFFAF5] border border-[#BCEADF] flex items-center justify-center text-[#174B43]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-[#202124]">
                Create New Business / Company
              </h2>
              <p className="text-xs text-[#667085]">
                {lang === "gu"
                  ? "નવો વેપાર / પેઢી ઉમેરો • Indian GST & Accounting"
                  : "Add New Business / Company • Indian GST & Accounting"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!canAdd && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold">Company limit reached on your plan</p>
                <p className="text-[11px] mt-0.5 text-amber-700">
                  Your current tier ({entitlements?.name || "Trial"}) allows up to {entitlements?.maxCompanies || 1} company. Contact support or upgrade to Wholesale Pro / Enterprise for additional companies.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Trade Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                {lang === "gu" ? "વેપાર નામ (Trade Name)" : "Trade / Business Name"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Audit Traders Ahmedabad"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] disabled:bg-gray-50"
              />
            </div>

            {/* Legal Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                {lang === "gu" ? "કાનૂની નામ (Legal Entity Name - Optional)" : "Legal Entity Name (Optional)"}
              </label>
              <input
                type="text"
                placeholder="e.g. Audit Traders Private Limited"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] disabled:bg-gray-50"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                GSTIN (15 Digits)
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="24ABCDE1234F1Z5"
                value={gstin}
                onChange={handleGstinChange}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 font-mono text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] uppercase disabled:bg-gray-50"
              />
            </div>

            {/* PAN */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="ABCDE1234F"
                value={pan}
                onChange={handlePanChange}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 font-mono text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] uppercase disabled:bg-gray-50"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                {lang === "gu" ? "રાજ્ય (GST State)" : "GST State"} <span className="text-red-500">*</span>
              </label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] bg-white disabled:bg-gray-50"
              >
                {Object.entries(INDIAN_STATES).map(([code, s]) => (
                  <option key={code} value={code}>
                    {code} - {lang === "gu" ? `${s.nameGujarati} (${s.name})` : s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                {lang === "gu" ? "શહેર (City / Town)" : "City / Town"}
              </label>
              <input
                type="text"
                placeholder="e.g. Ahmedabad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] disabled:bg-gray-50"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                {lang === "gu" ? "સરનામું (Business Address)" : "Business Address"}
              </label>
              <input
                type="text"
                placeholder="Shop No, Complex / Street Address"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] disabled:bg-gray-50"
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                PIN Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="380001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 font-mono text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] disabled:bg-gray-50"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                {lang === "gu" ? "સંપર્ક નંબર (Contact Phone)" : "Contact Phone"}
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                disabled={isSubmitting || !canAdd}
                className="w-full px-3 py-2 font-mono text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174B43]/30 focus:border-[#174B43] disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] text-[11px] text-[#6C757D] space-y-1">
            <p className="font-semibold text-[#495057]">Automatic Setup Included:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Default Main Branch (BR01)</li>
              <li>Current Financial Year (FY 2026-27)</li>
              <li>Standard Indian SME Chart of Accounts (Cash, Bank, Sales, GST, Parties)</li>
            </ul>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#4B5563] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canAdd}
              className="px-5 py-2 text-xs font-bold text-white bg-[#174B43] hover:bg-[#E06612] rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Creating Company...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Company</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
