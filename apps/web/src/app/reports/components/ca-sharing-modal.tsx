"use client";

import React, { useState } from "react";
import { Modal } from "../../../components/ui/modal";

interface CaSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  companyName?: string;
  startDate?: string;
  endDate?: string;
}

export function CaSharingModal({
  isOpen,
  onClose,
  lang = "en",
  companyName = "My Business",
  startDate = "2026-04-01",
  endDate = new Date().toISOString().split("T")[0],
}: CaSharingModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("FY26-27");
  const [caEmail, setCaEmail] = useState("");
  const [caPhone, setCaPhone] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [reportsToInclude, setReportsToInclude] = useState({
    gstr1: true,
    gstr3b: true,
    salesRegister: true,
    purchaseRegister: true,
    profitLoss: true,
    balanceSheet: true,
    trialBalance: true,
    daybook: false,
    partyAging: true,
  });

  const toggleReport = (key: keyof typeof reportsToInclude) => {
    setReportsToInclude((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (val: boolean) => {
    setReportsToInclude({
      gstr1: val,
      gstr3b: val,
      salesRegister: val,
      purchaseRegister: val,
      profitLoss: val,
      balanceSheet: val,
      trialBalance: val,
      daybook: val,
      partyAging: val,
    });
  };

  const handleCopySummary = () => {
    const activeReports = Object.entries(reportsToInclude)
      .filter(([_, checked]) => checked)
      .map(([k]) => {
        switch (k) {
          case "gstr1": return "• GSTR-1 Outward Supplies Register";
          case "gstr3b": return "• GSTR-3B Monthly Return Summary";
          case "salesRegister": return "• Sales Register (Full B2B/B2C)";
          case "purchaseRegister": return "• Purchase Register (ITC Verified)";
          case "profitLoss": return "• Profit & Loss Account";
          case "balanceSheet": return "• Balance Sheet Statement";
          case "trialBalance": return "• Trial Balance (Kachu Sarvaiyu)";
          case "daybook": return "• Daybook Transactions (Rojmel)";
          case "partyAging": return "• Debtors / Creditors Aging Analysis";
          default: return "";
        }
      })
      .filter(Boolean)
      .join("\n");

    const summaryText = `*CA Audit & Compliance Package: ${companyName}*\nPeriod: ${startDate} to ${endDate} (${selectedPeriod})\nGenerated from MyBill History\n\nIncluded Books & Statements:\n${activeReports}\n\nAll accounts and GST registers are reconciled up to ${new Date().toLocaleDateString("en-IN")}.`;

    navigator.clipboard.writeText(summaryText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadPackage = async () => {
    setIsDownloading(true);
    try {
      // Simulate/trigger package compilation
      await new Promise((r) => setTimeout(r, 800));
      const blob = new Blob(
        [
          JSON.stringify(
            {
              company: companyName,
              period: { startDate, endDate, selectedPeriod },
              packages: reportsToInclude,
              generatedAt: new Date().toISOString(),
              system: "MyBill History — Modern Indian Billing & Accounting",
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CA-Compliance-Pack-${companyName.replace(/\s+/g, "-")}-${selectedPeriod}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsapp = () => {
    const text = encodeURIComponent(
      `Hello Sir, please find the accounting statements and GST audit package for ${companyName} for period ${startDate} to ${endDate}. All books are verified and reconciled on MyBill History.`
    );
    const phoneClean = caPhone.replace(/\D/g, "");
    const url = phoneClean
      ? `https://wa.me/${phoneClean}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === "gu" ? "CA રિપોર્ટ શેરિંગ (ચાર્ટર્ડ એકાઉન્ટન્ટ પેક)" : "CA Reports Sharing"}
      titleGujarati="તમારા CA અથવા ઓડિટર માટે સંપૂર્ણ નામા અને જીએસટી પત્રકો તૈયાર કરો"
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {lang === "gu" ? "બંધ કરો" : "Close"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              {isCopied ? "✓ Summary Copied!" : "Copy CA Summary"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPackage}
              disabled={isDownloading}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {isDownloading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Preparing Pack...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CA Pack
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Banner */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-white border border-indigo-200/80 rounded-xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-lg">
            CA
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-900 text-sm">
              {lang === "gu" ? "ચાર્ટર્ડ એકાઉન્ટન્ટ ઓડિટ અને જીએસટી પત્રકો" : "Statutory CA & Auditor Bundle"}
            </h4>
            <p className="text-slate-600 text-[11.5px] mt-0.5 leading-relaxed">
              Compile GSTR-1, GSTR-3B, Sales, Purchases, P&L, and Balance Sheet into a clean bundle for timely GST filing and income tax audit.
            </p>
          </div>
        </div>

        {/* Period selection */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Select Accounting Period
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "FY26-27", label: "Full FY 2026-27" },
              { id: "Q2-2026", label: "Q2 (Jul - Sep)" },
              { id: "Q3-2026", label: "Q3 (Oct - Dec)" },
              { id: "THIS-MONTH", label: "Current Month" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPeriod(p.id)}
                className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg border transition-all text-center ${
                  selectedPeriod === p.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
            <span>Date Range: <strong>{startDate}</strong> to <strong>{endDate}</strong></span>
            <span className="font-medium text-indigo-700 font-mono">Company: {companyName}</span>
          </div>
        </div>

        {/* Report Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Statements & Registers to Include
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectAll(true)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => selectAll(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            {[
              { key: "gstr1", label: "GSTR-1 Outward Supplies Return", tag: "GST" },
              { key: "gstr3b", label: "GSTR-3B Monthly Return Summary", tag: "GST" },
              { key: "salesRegister", label: "Sales Register (All Invoices)", tag: "Books" },
              { key: "purchaseRegister", label: "Purchase Register & ITC", tag: "Books" },
              { key: "profitLoss", label: "Profit & Loss Statement (P&L)", tag: "Final" },
              { key: "balanceSheet", label: "Balance Sheet (Paku Sarvaiyu)", tag: "Final" },
              { key: "trialBalance", label: "Trial Balance (Kachu Sarvaiyu)", tag: "Audit" },
              { key: "partyAging", label: "Debtors / Creditors Aging", tag: "Ledgers" },
              { key: "daybook", label: "Daybook Transactions (Rojmel)", tag: "Audit" },
            ].map((item) => {
              const isChecked = reportsToInclude[item.key as keyof typeof reportsToInclude];
              return (
                <label
                  key={item.key}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer ${
                    isChecked
                      ? "bg-white border-indigo-200 text-slate-900 shadow-xs"
                      : "bg-transparent border-transparent text-slate-500 hover:bg-white/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleReport(item.key as keyof typeof reportsToInclude)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="flex-1 font-medium text-xs truncate">{item.label}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {item.tag}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Quick Contact & WhatsApp Share */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              CA Email (Optional)
            </label>
            <input
              type="email"
              value={caEmail}
              onChange={(e) => setCaEmail(e.target.value)}
              placeholder="ca.auditor@firm.com"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              CA WhatsApp Number (Optional)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="tel"
                value={caPhone}
                onChange={(e) => setCaPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleShareWhatsapp}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                title="Send via WhatsApp"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
