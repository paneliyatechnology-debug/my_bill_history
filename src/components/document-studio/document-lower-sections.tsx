"use client";

import React from "react";
import { DocumentNotesAndTermsProps, AdditionalInfoFields } from "./types";

export function DocumentNotesAndTermsCard({
  activeTab,
  onTabChange,
  notes,
  onNotesChange,
  terms,
  onTermsChange,
  onAttachFiles,
  attachedFilesCount = 0,
}: DocumentNotesAndTermsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      {/* Header with Icon and Tab Switcher */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xs sm:text-sm font-extrabold text-[#1A2E2B] tracking-tight">
            Notes & Terms
          </h3>
        </div>

        {/* Tab Pills matching Reference Image */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onTabChange("notes")}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === "notes"
                ? "bg-white text-[#174B43] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => onTabChange("terms")}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === "terms"
                ? "bg-white text-[#174B43] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Terms & Conditions
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div>
        {activeTab === "notes" ? (
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Enter notes for customer..."
            className="w-full text-xs p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#26A58A] focus:ring-2 focus:ring-[#26A58A]/10 shadow-2xs resize-none"
          />
        ) : (
          <textarea
            rows={3}
            value={terms}
            onChange={(e) => onTermsChange(e.target.value)}
            placeholder="Enter terms and conditions..."
            className="w-full text-xs p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#26A58A] focus:ring-2 focus:ring-[#26A58A]/10 shadow-2xs resize-none font-sans"
          />
        )}
      </div>

      {/* Attach Files Dropzone matching Reference Image */}
      <label className="border-2 border-dashed border-slate-200 hover:border-[#85D5C2] bg-slate-50/50 hover:bg-[#F2FAF7] rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors group">
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onAttachFiles?.(e.target.files)}
        />
        <svg className="w-4 h-4 text-[#174B43] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <div className="text-center">
          <span className="text-xs font-bold text-slate-700 group-hover:text-[#174B43]">
            Attach Files
          </span>
          <span className="text-[10px] text-slate-400 block font-medium">
            PDF, Images (Max 5MB) {attachedFilesCount > 0 ? `• ${attachedFilesCount} attached` : ""}
          </span>
        </div>
      </label>
    </div>
  );
}

export function DocumentAdditionalInfoCard({
  transportMode = "Road",
  onTransportModeChange,
  vehicleNo = "",
  onVehicleNoChange,
  ewayBillNo = "",
  onEwayBillNoChange,
  dispatchDate = "",
  onDispatchDateChange,
  customFields,
}: AdditionalInfoFields) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-[#E6F7F2] text-[#174B43] flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-xs sm:text-sm font-extrabold text-[#1A2E2B] tracking-tight">
          Additional Information
        </h3>
      </div>

      {customFields ? (
        customFields
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {/* Transport Mode */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">Transport Mode</label>
            <div className="relative">
              <select
                value={transportMode}
                onChange={(e) => onTransportModeChange?.(e.target.value)}
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#26A58A] shadow-2xs appearance-none pr-8 cursor-pointer"
              >
                <option value="Road">Road</option>
                <option value="Rail">Rail</option>
                <option value="Air">Air</option>
                <option value="Ship">Ship</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Vehicle No */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">Vehicle No.</label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => onVehicleNoChange?.(e.target.value)}
              placeholder="e.g. GJ-01-AB-1234"
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#26A58A] shadow-2xs uppercase"
            />
          </div>

          {/* E-Way Bill No */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">E-Way Bill No.</label>
            <input
              type="text"
              value={ewayBillNo}
              onChange={(e) => onEwayBillNoChange?.(e.target.value)}
              placeholder="Enter E-Way Bill No."
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#26A58A] shadow-2xs"
            />
          </div>

          {/* Dispatch Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">Dispatch Date</label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => onDispatchDateChange?.(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 focus:outline-none focus:border-[#26A58A] shadow-2xs cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
