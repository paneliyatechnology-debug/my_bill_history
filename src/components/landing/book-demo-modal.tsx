"use client";

import React, { useState } from "react";
import { X, CheckCircle2, MessageSquare, Phone, User, Building2, ArrowRight } from "lucide-react";
import { CustomSelect } from "@/components/ui/dropdown-system";

export interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "en" | "gu";
}

export function BookDemoModal({ isOpen, onClose, lang = "en" }: BookDemoModalProps) {
  const gu = lang === "gu";
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    businessName: "",
    businessType: "retailer",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleWhatsAppDirect = () => {
    const text = encodeURIComponent(
      `Hello MyOwn BillBook Team, I would like to book a live demo for my business (${formData.businessName || "My Business"}). Please contact me.`
    );
    window.open(`https://wa.me/917400199999?text=${text}`, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl border border-[#E5EAF1] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5EAF1] bg-[#F7F9FC] flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              {gu ? "લાઇવ પ્રોડક્ટ ડેમો" : "Live Product Demo"}
            </span>
            <h3 className="text-lg sm:text-xl font-semibold text-[#172033] mt-1.5" style={{ fontFamily: "var(--font-manrope)" }}>
              {gu ? "MyOwn BillBook ડેમો બુક કરો" : "Book a Personalized Demo"}
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              {gu ? "અમારા પ્રોડક્ટ એક્સપર્ટ સાથે ૧૫ મિનિટમાં સંપૂર્ણ સોફ્ટવેર સમજો." : "See how MyOwn BillBook simplifies billing & inventory in 15 minutes."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] hover:text-[#172033] hover:bg-slate-200/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#159B72] border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#172033]">
                  {gu ? "ડેમો વિનંતી સ્વીકારવામાં આવી!" : "Demo Request Received!"}
                </h4>
                <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto leading-relaxed">
                  {gu
                    ? "અમારા પ્રતિનિધિ ટૂંક સમયમાં તમારા નંબર પર ડેમો સમય નક્કી કરવા માટે સંપર્ક કરશે."
                    : "Our product specialist will reach out within 2 business hours to schedule your personalized walkthrough."}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleWhatsAppDirect}
                  className="w-full py-2.5 px-4 bg-[#159B72] hover:bg-[#128360] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{gu ? "વોટ્સએપ પર તાત્કાલિક જોડાઓ" : "Connect on WhatsApp Instantly"}</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 border border-[#E5EAF1] hover:bg-slate-50 text-[#172033] text-xs font-medium rounded-xl transition-colors"
                >
                  {gu ? "બંધ કરો" : "Close"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-[#172033] mb-1">
                  {gu ? "તમારું પૂરું નામ" : "Full Name"} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={gu ? "દા.ત. રમેશભાઈ પટેલ" : "e.g. Rajesh Sharma"}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs text-[#172033] bg-white border border-[#E5EAF1] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-[#172033] mb-1">
                  {gu ? "મોબાઈલ નંબર (WhatsApp)" : "Phone / WhatsApp Number"} *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs text-[#172033] bg-white border border-[#E5EAF1] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-xs font-medium text-[#172033] mb-1">
                  {gu ? "પેઢી / કંપનીનું નામ" : "Business Name"} *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={gu ? "દા.ત. શ્રી હરિ એન્ટરપ્રાઈઝ" : "e.g. Patel Traders & Co."}
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs text-[#172033] bg-white border border-[#E5EAF1] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-xs font-medium text-[#172033] mb-1">
                  {gu ? "વેપારનો પ્રકાર" : "Business Type"}
                </label>
                <CustomSelect
                  value={formData.businessType}
                  onChange={(val: any) => setFormData({ ...formData, businessType: val })}
                  options={[
                    { value: "retailer", label: gu ? "રિટેલર / દુકાનદાર (Retailer)" : "Retailer / Shop Counter" },
                    { value: "wholesaler", label: gu ? "હોલસેલર / વેપારી (Wholesaler)" : "Wholesaler / Trader" },
                    { value: "distributor", label: gu ? "ડિસ્ટ્રિબ્યુટર (Distributor)" : "Distributor / C&F Agent" },
                    { value: "manufacturer", label: gu ? "મેન્યુફેક્ચરર (Manufacturer)" : "Manufacturer / Workshop" },
                    { value: "services", label: gu ? "સર્વિસ પ્રોવાઇડર (Services)" : "Service Provider / Consultant" },
                  ]}
                  triggerClassName="rounded-xl border-[#E5EAF1] bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>{gu ? "ડેમો શેડ્યૂલ કરો" : "Schedule Live Demo"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleWhatsAppDirect}
                  className="py-2.5 px-3.5 border border-[#E5EAF1] hover:bg-slate-50 text-[#172033] text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#159B72]" />
                  <span>{gu ? "વોટ્સએપ ચેટ" : "WhatsApp"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
