"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/modal";
import { mailResultMessage, sendAppEmail } from "../../../lib/send-app-email";

interface CaSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  companyName?: string;
}

export function CaSharingModal({
  isOpen,
  onClose,
  lang = "en",
  companyName = "My Business",
}: CaSharingModalProps) {
  const [caName, setCaName] = useState("");
  const [caWhatsapp, setCaWhatsapp] = useState("");
  const [caEmail, setCaEmail] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [showLearnMore, setShowLearnMore] = useState(false);

  // Load saved CA details from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mybill_ca_details");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.name) setCaName(parsed.name);
          if (parsed.whatsapp) setCaWhatsapp(parsed.whatsapp);
          if (parsed.email) setCaEmail(parsed.email);
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caName.trim()) {
      alert("Please enter CA Name.");
      return;
    }
    if (!caWhatsapp.trim()) {
      alert("Please enter CA WhatsApp Number.");
      return;
    }

    const caData = {
      name: caName.trim(),
      whatsapp: caWhatsapp.trim(),
      email: caEmail.trim(),
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("mybill_ca_details", JSON.stringify(caData));
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1400);
    } catch {
      // ignore
    }
  };

  const handleEmailCa = async () => {
    if (!caEmail.includes("@")) {
      setEmailNote(lang === "gu" ? "CA નો ઈમેલ દાખલ કરો." : "Enter the CA email first.");
      return;
    }
    try {
      const result = await sendAppEmail({
        to: caEmail.trim(),
        subject: `${companyName} books are ready for review`,
        heading: "Books ready for review",
        intro: `Hello ${caName || "Sir"}, ${companyName} has shared its books for GST and financial review.`,
        details: [
          { label: "Business", value: companyName },
          { label: "Prepared for", value: caName || "Chartered Accountant" },
        ],
        text: "Open Reports and use Email Excel whenever a register needs to be sent.",
      });
      setEmailNote(mailResultMessage(result, lang === "gu" ? "gu" : "en"));
    } catch (err: any) {
      setEmailNote(err?.message || "Could not email the CA.");
    }
  };

  const handleSendViaWhatsapp = () => {
    if (!caWhatsapp) {
      alert("Please enter CA WhatsApp number first.");
      return;
    }
    const cleanNumber = caWhatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hello ${caName || "Sir"}, here are the monthly GST and Financial Reports for ${companyName} generated via MyBillBook. All accounts and ledgers are reconciled.`
    );
    window.open(`https://wa.me/${cleanNumber ? (cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber) : ""}?text=${msg}`, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="lg"
    >
      <div className="relative bg-white rounded-2xl overflow-hidden -m-4 sm:-m-6">
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-colors"
        >
          ✕
        </button>

        {/* Modal Header Illustration (Matching MyBillBook CA Sharing Modal) */}
        <div className="bg-gradient-to-b from-indigo-50/70 via-purple-50/40 to-white pt-6 pb-2 px-6 flex flex-col items-center border-b border-slate-100 text-center">
          <div className="relative w-full max-w-[340px] h-32 flex items-center justify-center mb-1">
            {/* SVG Illustration of CA with laptop & GSTR files */}
            <svg viewBox="0 0 400 160" className="w-full h-full">
              {/* Background desk & chair */}
              <rect x="180" y="110" width="180" height="8" rx="4" fill="#CBD5E1" />
              <rect x="230" y="118" width="80" height="4" rx="2" fill="#94A3B8" />

              {/* Computer monitor */}
              <rect x="245" y="55" width="60" height="42" rx="4" fill="#475569" />
              <rect x="250" y="60" width="50" height="32" rx="2" fill="#64748B" />
              <rect x="272" y="97" width="6" height="14" fill="#475569" />
              <ellipse cx="275" cy="111" rx="14" ry="3" fill="#334155" />

              {/* Files stack next to monitor */}
              <rect x="200" y="80" width="30" height="8" rx="2" fill="#3B82F6" />
              <rect x="200" y="90" width="30" height="8" rx="2" fill="#6366F1" />
              <rect x="200" y="100" width="30" height="8" rx="2" fill="#2563EB" />
              <circle cx="204" cy="84" r="1.5" fill="#FFFFFF" />
              <circle cx="204" cy="94" r="1.5" fill="#FFFFFF" />
              <circle cx="204" cy="104" r="1.5" fill="#FFFFFF" />

              {/* CA Character sitting */}
              <circle cx="330" cy="58" r="12" fill="#FBBF24" />
              {/* Glasses */}
              <circle cx="327" cy="58" r="3" fill="none" stroke="#1E293B" strokeWidth="1" />
              <circle cx="334" cy="58" r="3" fill="none" stroke="#1E293B" strokeWidth="1" />
              <line x1="330" y1="58" x2="331" y2="58" stroke="#1E293B" strokeWidth="1" />
              {/* Hair */}
              <path d="M 320 54 Q 328 45 338 50 Q 330 48 322 55" fill="#1E293B" />
              {/* Torso & Tie */}
              <path d="M 320 72 L 340 72 L 343 110 L 317 110 Z" fill="#F8FAFC" stroke="#E2E8F0" />
              <polygon points="328,72 332,72 333,96 330,102 327,96" fill="#EA580C" />

              {/* Dotted sending line from folder to CA */}
              <path
                d="M 120 70 Q 170 30 240 75"
                fill="none"
                stroke="#818CF8"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Left myBillBook Folder */}
              <g transform="translate(45, 60)">
                <rect x="0" y="0" width="60" height="42" rx="5" fill="#4F46E5" />
                <path d="M 0 5 Q 0 0 5 0 L 22 0 L 28 6 L 55 6 Q 60 6 60 11 L 60 42 L 0 42 Z" fill="#6366F1" />
                <rect x="6" y="10" width="48" height="26" rx="3" fill="#FFFFFF" opacity="0.95" />
                <text x="30" y="24" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#4338CA">
                  myBillBook
                </text>
                <polygon points="12,20 18,20 15,25" fill="#F47721" />
              </g>

              {/* Flying Report badges: GSTR 1 & GSTR 2 */}
              <g transform="translate(100, 42)">
                <rect x="0" y="0" width="38" height="20" rx="3" fill="#FFFFFF" stroke="#E2E8F0" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))" />
                <text x="19" y="13" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#334155">GSTR 1</text>
              </g>
              <g transform="translate(130, 68)">
                <rect x="0" y="0" width="38" height="20" rx="3" fill="#FFFFFF" stroke="#E2E8F0" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))" />
                <text x="19" y="13" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#334155">GSTR 2</text>
              </g>
            </svg>
          </div>

          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            CA Reports Sharing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatically share statutory reports to your CA every month
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {isSaved ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">
                ✓
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                CA Details Saved Successfully!
              </h3>
              <p className="text-xs text-slate-500">
                Reports will be synchronized with <strong>{caName}</strong> ({caWhatsapp}).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveDetails} className="space-y-3.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                CA Details
              </h3>

              {/* CA Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  CA Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={caName}
                  onChange={(e) => setCaName(e.target.value)}
                  placeholder="Ex: Ankit Mishra"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4C4CDD]/20 focus:border-[#4C4CDD] placeholder:text-slate-400"
                />
              </div>

              {/* CA WhatsApp Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  CA WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={caWhatsapp}
                  onChange={(e) => setCaWhatsapp(e.target.value)}
                  placeholder="Ex : 9876543210"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4C4CDD]/20 focus:border-[#4C4CDD] placeholder:text-slate-400"
                />
              </div>

              {/* CA Email ID (optional) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  CA Email ID (optional)
                </label>
                <input
                  type="email"
                  value={caEmail}
                  onChange={(e) => setCaEmail(e.target.value)}
                  placeholder="Ex: abc@gmail.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4C4CDD]/20 focus:border-[#4C4CDD] placeholder:text-slate-400"
                />
              </div>

              {/* Note banner */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Note:</strong> Email Excel or Email CA sends the report when you choose to. Nothing is sent automatically.
              </div>
              {emailNote && (
                <p className="text-[11px] font-semibold text-slate-700">{emailNote}</p>
              )}

              {/* Add Your CA Banner Card */}
              <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#0F3260] text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-wider">
                    CA
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Add Your CA and forget about the hassle of report sharing
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Authorized ICAI compliant portal sharing
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleEmailCa}
                    className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
                  >
                    Email CA
                  </button>
                  <button
                    type="button"
                    onClick={handleSendViaWhatsapp}
                    className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
                  >
                    Share on WhatsApp
                  </button>
                </div>
              </div>

              {showLearnMore && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">How CA Reports Sharing Works:</p>
                  <p>1. Enter your Chartered Accountant or tax auditor details.</p>
                  <p>2. Open a report and use Email Excel to send that period to the CA inbox.</p>
                  <p>3. Use Email CA to send a review note to the saved address.</p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLearnMore(!showLearnMore)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <span>ⓘ</span>
                  <span>{showLearnMore ? "Hide Info" : "Learn More"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#4C4CDD] hover:bg-[#3D3DCB] rounded-xl shadow-xs transition-colors"
                  >
                    Save Details
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
