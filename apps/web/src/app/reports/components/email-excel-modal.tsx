"use client";

import React, { useState } from "react";
import { Modal } from "../../../components/ui/modal";

interface EmailExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportName: string;
  lang?: string;
  onSendEmail?: (email: string, notes: string, subject: string) => Promise<void> | void;
}

export function EmailExcelModal({
  isOpen,
  onClose,
  reportName,
  lang = "en",
  onSendEmail,
}: EmailExcelModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState(`${reportName} - Financial & Accounting Report`);
  const [notes, setNotes] = useState(
    "Please find attached the official report generated from our billing and accounting software."
  );
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim() || !recipientEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    setIsSending(true);
    try {
      if (!onSendEmail) {
        throw new Error("Email sending is not connected.");
      }
      await onSendEmail(recipientEmail, notes, subject);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(err?.message || "Could not send the email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === "gu" ? "એક્સેલ રિપોર્ટ ઇમેઇલ કરો" : "Email Excel Report"}
      maxWidth="md"
    >
      {isSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
            ✓
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {lang === "gu" ? "રિપોર્ટ સફળતાપૂર્વક મોકલાયો!" : "Report Sent Successfully!"}
          </h3>
          <p className="text-xs text-slate-500">
            {reportName} has been dispatched to <strong>{recipientEmail}</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-2.5 text-xs text-blue-800">
            <span className="text-base">📊</span>
            <div>
              <p className="font-semibold text-blue-900">{reportName}</p>
              <p className="text-[11px] text-blue-700">
                A summary of this report is emailed. Download Excel separately if the spreadsheet file is needed.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. accountant@company.com or ca@firm.in"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F47721]/30 focus:border-[#F47721]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F47721]/30 focus:border-[#F47721]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F47721]/30 focus:border-[#F47721]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>✉</span>
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
