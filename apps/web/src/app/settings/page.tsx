"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { CreateCompanyModal } from "../../components/tenants/create-company-modal";
import { INDIAN_STATES } from "@billing/shared-types";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

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
    bankAccountBarcode: "",
    signatoryName: "",
    signatoryDesignation: "Authorised Signatory",
    signatureUrl: "",
    enableGujaratiPrint: true,
    allowNegativeStock: false,
  });

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [signatureMode, setSignatureMode] = useState<"upload" | "draw" | "generate">("upload");
  const [isDrawing, setIsDrawing] = useState(false);

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
            bankAccountBarcode: res.bankAccountBarcode || "",
            signatoryName: res.signatoryName || "",
            signatoryDesignation: res.signatoryDesignation || "Authorised Signatory",
            signatureUrl: res.signatureUrl || "",
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

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(lang === "gu" ? "ફાઈલ સાઇઝ 2MB કરતા ઓછી હોવી જોઈએ." : "File size must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormData((prev) => ({ ...prev, signatureUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const generateCursiveSignature = () => {
    const nameToSign =
      formData.signatoryName.trim() ||
      formData.tradeName.trim() ||
      formData.legalName.trim() ||
      "Audit Admin";
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "italic 42px 'Brush Script MT', 'Dancing Script', 'Caveat', cursive, sans-serif";
    ctx.fillStyle = "#1e3a8a"; // premium blue ink
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(nameToSign, canvas.width / 2, 50);

    // Decorative underline flourish
    ctx.beginPath();
    ctx.moveTo(50, 80);
    ctx.quadraticCurveTo(200, 105, 350, 75);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1e3a8a";
    ctx.stroke();

    const dataUrl = canvas.toDataURL("image/png");
    setFormData((prev) => ({ ...prev, signatureUrl: dataUrl }));
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ("clientY" in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ("clientY" in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveDrawnSignature = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setFormData((prev) => ({ ...prev, signatureUrl: dataUrl }));
  };

  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

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
      await refreshTenantMetadata();
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {lang === "gu"
                  ? "બેંક, યુપીઆઇ અને બારકોડ વિગતો (Bank, UPI & Barcode Details)"
                  : "Bank, UPI & Barcode Details"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === "gu"
                  ? "આ વિગતો અને બારકોડ આપમેળે સેલ્સ ઇન્વોઇસ પર પ્રિન્ટ થશે."
                  : "These details and barcode will automatically be displayed on Sales Invoices."}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-lg">
              🏷️ {lang === "gu" ? "ઇન્વોઇસ બારકોડ સપોર્ટ" : "Invoice Barcode Support"}
            </span>
          </div>

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
                placeholder="Central Bank of India / SBI"
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
                placeholder="e.g. 5697993361"
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
                placeholder="CBIN0281024"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "શાખાનું નામ (Branch)" : "Branch Name"}
              </label>
              <input
                type="text"
                name="bankBranch"
                value={formData.bankBranch}
                onChange={handleChange}
                placeholder="Ahmedabad Main / DARAULI"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu"
                  ? "UPI VPA (QR કોડ માટે)"
                  : "UPI ID / VPA (For Payment QR)"}
              </label>
              <input
                type="text"
                name="upiVpa"
                value={formData.upiVpa}
                onChange={handleChange}
                placeholder="merchant@okaxis / 8851844152@ptaxis"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === "gu"
                    ? "બેંક એકાઉન્ટ બારકોડ (Bank Barcode)"
                    : "Bank Account Barcode"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const generated = formData.bankAccountNo
                      ? `${formData.bankAccountNo}`
                      : `63${Math.floor(100000000 + Math.random() * 900000000)}`;
                    setFormData((prev) => ({ ...prev, bankAccountBarcode: generated }));
                  }}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200"
                >
                  ⚡ {lang === "gu" ? "ઓટો જનરેટ" : "Auto Generate"}
                </button>
              </div>
              <input
                type="text"
                name="bankAccountBarcode"
                value={formData.bankAccountBarcode}
                onChange={handleChange}
                placeholder="e.g. 5697993361 or 63852523994"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Barcode & QR Realtime Visual Card */}
          <div className="mt-4 p-4 bg-[#FAFBFD] rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-around gap-6">
            {/* Live SVG Barcode Preview */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-200 shadow-xs min-w-[240px]">
              <span className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                {lang === "gu" ? "ઇન્વોઇસ બેંક બારકોડ" : "Invoice Bank Barcode"}
              </span>
              {formData.bankAccountBarcode ? (
                <>
                  <svg
                    ref={(el) => {
                      if (el && formData.bankAccountBarcode) {
                        try {
                          JsBarcode(el, formData.bankAccountBarcode, {
                            format: "CODE128",
                            width: 1.5,
                            height: 44,
                            displayValue: true,
                            fontSize: 12,
                            margin: 4,
                          });
                        } catch {
                          // ignore format error
                        }
                      }
                    }}
                    className="max-w-[220px]"
                  />
                  <span className="text-[10px] text-emerald-700 font-medium mt-1">
                    ✓ {lang === "gu" ? "સ્કેનેબલ Code-128 બારકોડ" : "Scannable Code-128 Barcode"}
                  </span>
                </>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  {lang === "gu"
                    ? "બારકોડ જોવા માટે ઉપર બારકોડ નંબર લખો અથવા 'ઓટો જનરેટ' ક્લિક કરો."
                    : "Enter barcode or click 'Auto Generate' to view barcode preview"}
                </div>
              )}
            </div>

            {/* Live QR Code Preview */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-200 shadow-xs min-w-[200px]">
              <span className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                {lang === "gu" ? "લાઇવ પેમેન્ટ QR કોડ" : "Live Payment QR Code"}
              </span>
              {formData.upiVpa ? (
                <>
                  <canvas
                    ref={(canvas) => {
                      if (canvas && formData.upiVpa) {
                        const upiUrl = `upi://pay?pa=${encodeURIComponent(
                          formData.upiVpa,
                        )}&pn=${encodeURIComponent(
                          formData.tradeName || formData.legalName || "Merchant",
                        )}&cu=INR`;
                        QRCode.toCanvas(canvas, upiUrl, {
                          width: 100,
                          margin: 1,
                        }).catch(() => {});
                      }
                    }}
                    className="rounded shadow-2xs"
                  />
                  <span className="text-[10px] font-mono text-slate-700 mt-1 font-semibold">
                    {formData.upiVpa}
                  </span>
                </>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  {lang === "gu"
                    ? "QR કોડ જોવા માટે UPI ID લખો"
                    : "Enter UPI ID to view payment QR"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Authorized Signatory & Digital Signature */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>✍️</span>
                <span>
                  {lang === "gu"
                    ? "અધિકૃત સહી અને ડિજિટલ સિગ્નેચર (Signatory & Digital Signature)"
                    : "Authorized Signatory & Digital Signature"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === "gu"
                  ? "બધા વેચાણ ઇન્વોઇસ અને બિલમાં આપોઆપ છપાતી સહી અને વિગતો"
                  : "Configure signature stamp, signatory name, and designation printed on all invoices."}
              </p>
            </div>
            {formData.signatureUrl && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 self-start sm:self-auto">
                <span>✓</span>
                <span>{lang === "gu" ? "સહી સેટ કરેલ છે" : "Signature Active"}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu"
                  ? "અધિકૃત સહી કરનારનું નામ (Signatory Name)"
                  : "Signatory Name"}
              </label>
              <input
                type="text"
                name="signatoryName"
                value={formData.signatoryName}
                onChange={handleChange}
                placeholder="e.g. Jaydeep Patel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {lang === "gu"
                  ? "ઇન્વોઇસના અંતે સહી નીચે છપાશે"
                  : "Will be printed under signature line on invoices"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu"
                  ? "હોદ્દો / પદવી (Signatory Designation)"
                  : "Signatory Designation"}
              </label>
              <input
                type="text"
                name="signatoryDesignation"
                value={formData.signatoryDesignation}
                onChange={handleChange}
                placeholder="Authorised Signatory / Proprietor / Partner"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {lang === "gu"
                  ? "દા.ત. Authorised Signatory અથવા Proprietor"
                  : "e.g. Authorised Signatory, Proprietor, Director"}
              </span>
            </div>
          </div>

          {/* Signature Mode Selector */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {lang === "gu" ? "સહી ઉમેરવાની પદ્ધતિ પસંદ કરો:" : "Select Signature Method:"}
              </span>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setSignatureMode("upload")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    signatureMode === "upload"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📁 {lang === "gu" ? "ઇમેજ અપલોડ" : "Upload File"}
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode("draw")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    signatureMode === "draw"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✍️ {lang === "gu" ? "અહીં સહી દોરો" : "Draw Signature"}
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode("generate")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    signatureMode === "generate"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ⚡ {lang === "gu" ? "ઓટો સ્ટાઇલિશ સહી" : "Auto Stylize"}
                </button>
              </div>
            </div>

            {/* Mode 1: File Upload */}
            {signatureMode === "upload" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === "gu"
                    ? "સહી અથવા સ્ટેમ્પ ઇમેજ પસંદ કરો (PNG / JPG / WebP)"
                    : "Upload Signature or Stamp Image (PNG / JPG / WebP)"}
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleSignatureUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  {lang === "gu"
                    ? "પારદર્શક (Transparent) બેકગ્રાઉન્ડ વાળી PNG ઇમેજ ઉત્તમ પરિણામ આપશે (મહત્તમ ૨MB)."
                    : "Transparent PNG with dark ink produces the cleanest look on invoice prints (Max 2MB)."}
                </p>
              </div>
            )}

            {/* Mode 2: Interactive Draw Pad */}
            {signatureMode === "draw" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    {lang === "gu"
                      ? "માઉસ અથવા આંગળી વડે બોક્સમાં સહી કરો:"
                      : "Sign inside the box using mouse, touchpad or stylus:"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearDrawCanvas}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white border border-slate-200 rounded-lg hover:border-rose-300"
                    >
                      🧹 {lang === "gu" ? "સાફ કરો" : "Clear"}
                    </button>
                    <button
                      type="button"
                      onClick={saveDrawnSignature}
                      className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                    >
                      💾 {lang === "gu" ? "આ સહી રાખો" : "Use This Signature"}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 overflow-hidden flex justify-center">
                  <canvas
                    ref={drawCanvasRef}
                    width={420}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair touch-none w-full max-w-[420px] bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === "gu"
                    ? "સહી દોર્યા પછી 'આ સહી રાખો' (Use This Signature) બટન પર ક્લિક કરો."
                    : "After signing, click 'Use This Signature' to apply."}
                </p>
              </div>
            )}

            {/* Mode 3: Auto Cursive Signature Generation */}
            {signatureMode === "generate" && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {lang === "gu"
                        ? "ઓટોમેટિક ડિજિટલ સહી બનાવો"
                        : "Generate Digital Script Signature"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lang === "gu"
                        ? `નામ '${formData.signatoryName || formData.tradeName || "User"}' પરથી સુંદર બ્લૂ ઇંક સહી બનાવો`
                        : `Instantly creates a handwritten ink signature for '${formData.signatoryName || formData.tradeName || "Signatory"}'`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generateCursiveSignature}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0"
                  >
                    ⚡ {lang === "gu" ? "સહી જનરેટ કરો" : "Generate Signature"}
                  </button>
                </div>
              </div>
            )}

            {/* Live Invoice Signature Stamp Preview */}
            <div className="p-4 bg-[#FAFBFD] rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === "gu" ? "ઇન્વોઇસ પર કેવું દેખાશે (Live Preview):" : "Invoice Preview:"}
                </span>
                <p className="text-xs text-slate-600">
                  {lang === "gu"
                    ? "ઇન્વોઇસના જમણા છેડે આ રીતે અધિકૃત સહી અને વિગતો છપાશે."
                    : "This exact stamp block is rendered on all invoices and PDF downloads."}
                </p>
                {formData.signatureUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, signatureUrl: "" }))}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline pt-1 flex items-center gap-1"
                  >
                    <span>🗑️</span>
                    <span>{lang === "gu" ? "સહી દૂર કરો (Remove Signature)" : "Remove Signature"}</span>
                  </button>
                )}
              </div>

              {/* Stamp box preview */}
              <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs min-w-[240px] text-right space-y-1">
                <p className="font-bold text-slate-900 text-[11px] uppercase">
                  For {formData.tradeName || formData.legalName || "MyBill History Enterprise"}
                </p>
                <div className="h-14 flex items-end justify-end py-1">
                  {formData.signatureUrl ? (
                    <img
                      src={formData.signatureUrl}
                      alt="Signature Preview"
                      className="max-h-12 max-w-[160px] object-contain block"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-300 italic font-mono">
                      [ Signature Line ]
                    </span>
                  )}
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-semibold text-slate-800 text-[11px]">
                    {formData.signatoryName || "Authorized Person"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formData.signatoryDesignation || "Authorised Signatory"}
                  </p>
                </div>
              </div>
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
