"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/auth-context";
import { INDIAN_STATES } from "@billing/shared-types";
import { CustomCombobox } from "@/components/ui/dropdown-system";
import {
  Building2,
  X,
  Check,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Loader2,
  MapPin,
  Phone,
  Mail,
  FileText,
} from "lucide-react";

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
  const gu = lang === "gu";

  const [mounted, setMounted] = useState(false);
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

  // Client-side mount check for createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Prevent background scrolling while modal is open & handle Escape key
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting]);

  if (!isOpen || !mounted) return null;

  const canAdd = entitlements?.canAddCompany ?? true;
  const currentCount = entitlements?.currentCount ?? 0;
  const maxLimit = entitlements?.maxCompanies ?? 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tradeName.trim()) {
      setError(gu ? "વેપાર નામ (Business Name) જરૂરી છે." : "Business / Trade Name is required.");
      return;
    }

    if (!canAdd) {
      setError(
        gu
          ? `પ્લાન મર્યાદા પૂર્ણ (${currentCount}/${maxLimit} કંપનીઓ). વધુ કંપની ઉમેરવા માટે પ્લાન અપગ્રેડ કરો.`
          : `Subscription plan limit reached (${currentCount}/${maxLimit} companies). Please upgrade your plan to add more businesses.`,
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
        (gu ? "કંપની બનાવવામાં નિષ્ફળતા. કૃપા કરીને વિગતો તપાસો." : "Failed to create business. Please verify details and try again.");
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Indian States Options for CustomCombobox
  const stateOptions = Object.entries(INDIAN_STATES).map(([code, s]) => ({
    value: code,
    label: `${code} - ${gu ? `${s.nameGujarati} (${s.name})` : s.name}`,
  }));

  // Render via React Portal to document.body so that fixed positioning is never trapped by header backdrop-filter
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-company-modal-title"
    >
      {/* Semi-transparent Backdrop Overlay with subtle blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 flex flex-col max-h-[min(90vh,760px)] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] border border-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="create-company-modal-title" className="text-base sm:text-[17px] font-bold text-slate-900 truncate">
                  {gu ? "નવી પેઢી / વેપાર ઉમેરો" : "Add New Business / Company"}
                </h2>
                {maxLimit > 0 && (
                  <span className="hidden sm:inline-block text-[10px] font-bold bg-blue-50 text-[#1677E8] border border-blue-200/80 px-2 py-0.5 rounded-full shrink-0">
                    {gu ? `કંપની ${currentCount + 1}/${maxLimit}` : `Company ${currentCount + 1} of ${maxLimit}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {gu
                  ? "અલગ બિલિંગ, ખાતાવહી અને GST ફાઇલિંગ માટે નવી પેઢી સેટ કરો"
                  : "Setup separate books, invoicing, ledgers & GST compliance"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {/* Plan Limit Warning */}
            {!canAdd && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">
                    {gu ? "પ્લાન કંપની લિમિટ પૂર્ણ થયેલ છે" : "Company limit reached on your plan"}
                  </p>
                  <p className="text-[11px] mt-0.5 text-amber-700 leading-relaxed">
                    {gu
                      ? `તમારા હાલના પ્લાનમાં ${maxLimit} કંપની મંજૂર છે. વધુ કંપનીઓ ઉમેરવા માટે સેટિંગ્સમાંથી Wholesale Pro અથવા Enterprise પ્લાન અપગ્રેડ કરો.`
                      : `Your current tier allows up to ${maxLimit} companies. Please upgrade to Wholesale Pro or Enterprise to add more companies.`}
                  </p>
                </div>
              </div>
            )}

            {/* Section 1: Business Identity */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
                <FileText className="w-3.5 h-3.5 text-[#1677E8]" />
                <span>{gu ? "૧. વ્યવસાયિક વિગતો" : "1. Business Identity"}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Trade Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "વેપાર / પેઢીનું નામ (Trade Name)" : "Business / Trade Name"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={gu ? "દા.ત. શ્રી ગણેશ ટ્રેડિંગ કંપની" : "e.g. Shree Ganesh Trading Co."}
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    disabled={isSubmitting || !canAdd}
                    className="w-full px-3.5 py-2 text-xs sm:text-[13px] font-semibold text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* Legal Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "કાનૂની નામ (Legal Entity Name - જો અલગ હોય)" : "Legal Entity Name (Optional)"}
                  </label>
                  <input
                    type="text"
                    placeholder={gu ? "દા.ત. શ્રી ગણેશ ટ્રેડિંગ પ્રાઇવેટ લિમિટેડ" : "e.g. Shree Ganesh Trading Pvt Ltd"}
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    disabled={isSubmitting || !canAdd}
                    className="w-full px-3.5 py-2 text-xs sm:text-[13px] font-medium text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: GST & Tax Identification */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{gu ? "૨. GSTIN અને ટેક્સ નોંધણી" : "2. GST & Tax Registration"}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* GSTIN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      GSTIN (15 Digits)
                    </label>
                    {gstin.length === 15 && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                        Valid Length
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="24AAAAA0000A1Z5"
                    value={gstin}
                    onChange={handleGstinChange}
                    disabled={isSubmitting || !canAdd}
                    className="w-full px-3.5 py-2 tabular-nums text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* PAN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      PAN (10 Digits)
                    </label>
                    {pan.length === 10 && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                        Valid
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="AAAAA0000A"
                    value={pan}
                    onChange={handlePanChange}
                    disabled={isSubmitting || !canAdd}
                    className="w-full px-3.5 py-2 tabular-nums text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Location & State */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>{gu ? "૩. સ્થળ અને રાજ્ય વિગતો" : "3. Location & Place of Business"}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* State Combobox */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "રાજ્ય (GST State Code)" : "GST State"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <CustomCombobox
                    value={stateCode}
                    onChange={(val: any) => setStateCode(val)}
                    disabled={isSubmitting || !canAdd}
                    options={stateOptions}
                    placeholder={gu ? "રાજ્ય પસંદ કરો..." : "Select State..."}
                    triggerClassName="rounded-xl border-slate-200 bg-slate-50/60 text-xs sm:text-[13px] font-medium h-10"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "શહેર (City / Town)" : "City / Town"}
                  </label>
                  <input
                    type="text"
                    placeholder={gu ? "દા.ત. અમદાવાદ" : "e.g. Ahmedabad"}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={isSubmitting || !canAdd}
                    className="w-full px-3.5 py-2 text-xs sm:text-[13px] font-medium text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* Address Line */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "સરનામું (Business Address)" : "Business Address"}
                  </label>
                  <input
                    type="text"
                    placeholder={gu ? "દુકાન / ઓફિસ નંબર, કોમ્પ્લેક્સ, રોડ" : "Shop No, Complex / Street Address"}
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    disabled={isSubmitting || !canAdd}
                    className="w-full px-3.5 py-2 text-xs sm:text-[13px] font-medium text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* PIN Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="380001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    disabled={isSubmitting || !canAdd}
                    className="w-full px-3.5 py-2 tabular-nums text-xs sm:text-[13px] font-medium text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "સંપર્ક નંબર (Phone)" : "Contact Phone"}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      disabled={isSubmitting || !canAdd}
                      className="w-full px-3.5 py-2 tabular-nums text-xs sm:text-[13px] font-medium text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {gu ? "ઇમેઇલ સરનામું (Email - Optional)" : "Business Email (Optional)"}
                  </label>
                  <input
                    type="email"
                    placeholder="contact@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting || !canAdd}
                    className="w-full px-3.5 py-2 text-xs sm:text-[13px] font-medium text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 transition-all disabled:bg-slate-100 h-10 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Automatic Setup Included Card */}
            <div className="p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-[#1677E8]" />
                <span>{gu ? "આ કંપની સાથે આપોઆપ સેટઅપ થશે:" : "Automatic Setup Included:"}</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 pt-0.5">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>{gu ? "મુખ્ય શાખા (BR01 Main Branch)" : "Default Main Branch (BR01)"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>{gu ? "નાણાકીય વર્ષ (FY 2026-27)" : "Current Financial Year (FY 2026-27)"}</span>
                </li>
                <li className="flex items-center gap-1.5 sm:col-span-2">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>
                    {gu
                      ? "ઇન્ડિયન SME સ્ટાન્ડર્ડ ખાતાવહી (Cash, Bank, Sales, GST, Parties)"
                      : "Standard Indian SME Chart of Accounts (Cash, Bank, Sales, GST)"}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sticky Modal Footer (always visible, never cut off) */}
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {gu ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canAdd}
              className="h-10 px-5 text-xs font-semibold text-white bg-[#1677E8] hover:bg-[#1268D3] rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{gu ? "કંપની બની રહી છે..." : "Creating Company..."}</span>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>{gu ? "કંપની ઉમેરો" : "Create Company"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
