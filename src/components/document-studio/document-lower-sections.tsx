"use client";

import React, { useState } from "react";
import { DocumentNotesAndTermsProps, AdditionalInfoFields, AttachedDocumentFile } from "./types";
import { CustomSelect } from "@/components/ui/dropdown-system";
import { CustomDatePicker } from "@/components/ui/custom-datepicker";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

export function DocumentNotesAndTermsCard({
  activeTab,
  onTabChange,
  notes,
  onNotesChange,
  terms,
  onTermsChange,
  onAttachFiles,
  attachedFilesCount,
  attachedFiles,
  onRemoveAttachedFile,
}: DocumentNotesAndTermsProps) {
  const [localFiles, setLocalFiles] = useState<AttachedDocumentFile[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayedFiles = attachedFiles ?? localFiles;
  const effectiveCount = attachedFilesCount ?? displayedFiles.length;

  const processIncomingFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setAttachError(null);

    const valid: AttachedDocumentFile[] = [];
    const rejected: string[] = [];

    Array.from(fileList).forEach((file) => {
      const isAllowedType =
        file.type === "application/pdf" ||
        file.type.startsWith("image/") ||
        /\.(pdf|png|jpe?g|webp|gif)$/i.test(file.name);
      if (!isAllowedType) {
        rejected.push(`${file.name} (only PDF/Images allowed)`);
        return;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        rejected.push(`${file.name} (exceeds 5MB limit)`);
        return;
      }
      valid.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      });
    });

    if (rejected.length > 0) {
      setAttachError(`Skipped: ${rejected.join(", ")}`);
    }

    if (valid.length > 0) {
      if (!attachedFiles) {
        setLocalFiles((prev) => {
          const existingNames = new Set(prev.map((f) => `${f.name}-${f.size}`));
          const unique = valid.filter((v) => !existingNames.has(`${v.name}-${v.size}`));
          return [...prev, ...unique];
        });
      }
      onAttachFiles?.(fileList);
    }
  };

  const handleRemove = (id: string) => {
    if (onRemoveAttachedFile) {
      onRemoveAttachedFile(id);
    } else {
      setLocalFiles((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      {/* Header with Icon and Tab Switcher */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0F172A] flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="typo-form-section text-[#182230]">
            Notes & Terms
          </h3>
        </div>

        {/* Tab Pills matching Reference Image */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onTabChange("notes")}
            className={`px-3 py-1 rounded-md typo-tab transition-all cursor-pointer ${activeTab === "notes"
                ? "bg-white text-[#0F172A] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => onTabChange("terms")}
            className={`px-3 py-1 rounded-md typo-tab transition-all cursor-pointer ${activeTab === "terms"
                ? "bg-white text-[#0F172A] shadow-xs"
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
            className="w-full typo-input p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 shadow-2xs resize-none"
          />
        ) : (
          <textarea
            rows={3}
            value={terms}
            onChange={(e) => onTermsChange(e.target.value)}
            placeholder="Enter terms and conditions..."
            className="w-full typo-input p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10 shadow-2xs resize-none"
          />
        )}
      </div>

      {/* Attach Files Dropzone matching Reference Image */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          processIncomingFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors group ${
          isDragging
            ? "border-[#1677E8] bg-blue-50/40"
            : "border-slate-200 hover:border-[#93C5FD] bg-slate-50/50 hover:bg-[#F8FAFC]"
        }`}
      >
        <input
          type="file"
          multiple
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            processIncomingFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <svg className="w-4 h-4 text-[#0F172A] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <div className="text-center">
          <span className="typo-label font-semibold text-slate-700 group-hover:text-[#0F172A] block">
            Attach Files
          </span>
          <span className="typo-card-desc text-slate-400 block">
            PDF, Images (Max 5MB) {effectiveCount > 0 ? `• ${effectiveCount} attached` : ""}
          </span>
        </div>
      </label>

      {attachError && (
        <p className="text-[11px] text-rose-600 font-medium">{attachError}</p>
      )}

      {displayedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayedFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 py-1.5 px-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs"
            >
              <span className="font-medium text-slate-800 max-w-[180px] truncate">{f.name}</span>
              <span className="text-[10px] text-slate-500">({formatBytes(f.size)})</span>
              <button
                type="button"
                onClick={() => handleRemove(f.id)}
                className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer font-bold leading-none"
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const INDIAN_VEHICLE_REGEX =
  /^(?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{0,3}[-\s]?\d{4}|\d{2}[-\s]?BH[-\s]?\d{4}[-\s]?[A-Z]{1,2})$/;
const RAIL_SHIP_REF_REGEX = /^[A-Z0-9][A-Z0-9-\/\s]{3,19}$/;
const AIRWAY_BILL_REGEX = /^[A-Z0-9][A-Z0-9-\/\s]{5,19}$/;
const EWAY_BILL_REGEX = /^\d{12}$/;

const TRANSPORT_FIELD_META: Record<
  string,
  { label: string; placeholder: string; maxLength: number; errorMsg: string; regex: RegExp }
> = {
  Road: {
    label: "Vehicle No.",
    placeholder: "e.g. GJ-01-AB-1234",
    maxLength: 15,
    errorMsg: "Invalid vehicle no. (e.g. GJ-01-AB-1234)",
    regex: INDIAN_VEHICLE_REGEX,
  },
  Rail: {
    label: "RR / Wagon No.",
    placeholder: "e.g. RR-2120001234",
    maxLength: 20,
    errorMsg: "Invalid RR / Wagon No. (4-20 alphanumeric chars)",
    regex: RAIL_SHIP_REF_REGEX,
  },
  Air: {
    label: "Airway Bill (AWB) No.",
    placeholder: "e.g. 176-12345678",
    maxLength: 20,
    errorMsg: "Invalid Airway Bill No. (6-20 alphanumeric chars)",
    regex: AIRWAY_BILL_REGEX,
  },
  Ship: {
    label: "B/L / Vessel No.",
    placeholder: "e.g. BOL-9876543",
    maxLength: 20,
    errorMsg: "Invalid B/L or Vessel No. (4-20 alphanumeric chars)",
    regex: RAIL_SHIP_REF_REGEX,
  },
};

export function validateAdditionalInfo(fields: {
  transportMode?: string;
  vehicleNo?: string;
  ewayBillNo?: string;
  freightAmount?: number | "";
}): { vehicleNo?: string; ewayBillNo?: string; freightAmount?: string } {
  const errors: { vehicleNo?: string; ewayBillNo?: string; freightAmount?: string } = {};
  const mode = fields.transportMode || "Road";
  const meta = TRANSPORT_FIELD_META[mode] || TRANSPORT_FIELD_META.Road;
  const v = (fields.vehicleNo || "").trim().toUpperCase();
  if (v && !meta.regex.test(v)) {
    errors.vehicleNo = meta.errorMsg;
  }
  const ewb = (fields.ewayBillNo || "").trim();
  if (ewb && !EWAY_BILL_REGEX.test(ewb)) {
    errors.ewayBillNo = "E-Way Bill No. must be 12 digits";
  }
  if (fields.freightAmount !== "" && fields.freightAmount !== undefined && Number(fields.freightAmount) < 0) {
    errors.freightAmount = "Freight cannot be negative";
  }
  return errors;
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
  freightAmount = "",
  onFreightAmountChange,
  salespersonName = "",
  onSalespersonNameChange,
  mrnNumber = "",
  onMrnNumberChange,
  customFields,
}: AdditionalInfoFields) {
  const [touched, setTouched] = useState<{ vehicleNo?: boolean; ewayBillNo?: boolean }>({});
  const transportMeta = TRANSPORT_FIELD_META[transportMode] || TRANSPORT_FIELD_META.Road;
  const errors = validateAdditionalInfo({ transportMode, vehicleNo, ewayBillNo, freightAmount });

  const showVehicleError = Boolean(errors.vehicleNo && (touched.vehicleNo || (vehicleNo && vehicleNo.trim().length >= 4)));
  const showEwayError = Boolean(errors.ewayBillNo && (touched.ewayBillNo || (ewayBillNo && ewayBillNo.trim().length > 0 && ewayBillNo.trim().length !== 12)));
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0F172A] flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="typo-form-section text-[#182230]">
          Additional Information
        </h3>
      </div>

      {customFields ? (
        customFields
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Transport Mode */}
          <div className="space-y-1">
            <label className="typo-label text-slate-600 block">Transport Mode</label>
            <CustomSelect
              size="sm"
              value={transportMode}
              onChange={(val: any) => onTransportModeChange?.(val)}
              options={[
                { value: "Road", label: "Road" },
                { value: "Rail", label: "Rail" },
                { value: "Air", label: "Air" },
                { value: "Ship", label: "Ship" },
              ]}
              triggerClassName="rounded-xl border-slate-200 bg-white"
            />
          </div>

          {/* Vehicle No / Transport Ref No */}
          <div className="space-y-1">
            <label className="typo-label text-slate-600 block">{transportMeta.label}</label>
            <input
              type="text"
              maxLength={transportMeta.maxLength}
              value={vehicleNo}
              onChange={(e) => {
                const pattern = transportMode === "Road" ? /[^A-Z0-9-\s]/g : /[^A-Z0-9-\/\s]/g;
                const cleaned = e.target.value.toUpperCase().replace(pattern, "");
                onVehicleNoChange?.(cleaned);
              }}
              onBlur={() => setTouched((p) => ({ ...p, vehicleNo: true }))}
              placeholder={transportMeta.placeholder}
              className={`w-full py-1.5 px-2.5 bg-white border rounded-xl typo-input typo-invoice-no text-slate-800 placeholder:text-slate-400 focus:outline-none shadow-2xs uppercase h-9 ${
                showVehicleError
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-slate-200 focus:border-[#1677E8]"
              }`}
            />
            {showVehicleError && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.vehicleNo}</p>
            )}
          </div>

          {/* E-Way Bill No */}
          <div className="space-y-1">
            <label className="typo-label text-slate-600 block">E-Way Bill No.</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={ewayBillNo}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 12);
                onEwayBillNoChange?.(digitsOnly);
              }}
              onBlur={() => setTouched((p) => ({ ...p, ewayBillNo: true }))}
              placeholder="12-digit E-Way Bill No."
              className={`w-full py-1.5 px-2.5 bg-white border rounded-xl typo-input typo-invoice-no text-slate-800 placeholder:text-slate-400 focus:outline-none shadow-2xs h-9 ${
                showEwayError
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-slate-200 focus:border-[#1677E8]"
              }`}
            />
            {showEwayError && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.ewayBillNo}</p>
            )}
          </div>

          {/* Dispatch Date */}
          <div className="space-y-1">
            <label className="typo-label text-slate-600 block">Dispatch Date</label>
            <CustomDatePicker
              size="sm"
              value={dispatchDate}
              onChange={(val) => onDispatchDateChange?.(val)}
              placeholder="DD/MM/YYYY"
              triggerClassName="rounded-xl border-slate-200 bg-white h-9"
            />
          </div>

          {/* Freight */}
          <div className="space-y-1">
            <label className="typo-label text-slate-600 block">Freight</label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-xs text-slate-400 font-bold pointer-events-none">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                value={freightAmount === 0 || freightAmount === "" ? "" : freightAmount}
                onChange={(e) => {
                  if (e.target.value === "") {
                    onFreightAmountChange?.("");
                  } else {
                    const num = Math.max(0, Number(e.target.value) || 0);
                    onFreightAmountChange?.(num);
                  }
                }}
                placeholder="0.00"
                className="w-full py-1.5 pl-6 pr-2.5 bg-white border border-slate-200 rounded-xl typo-input text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1677E8] shadow-2xs h-9 text-right tabular-nums font-semibold"
              />
            </div>
          </div>

          {onSalespersonNameChange && (
            <div className="space-y-1">
              <label className="typo-label text-slate-600 block">Salesperson</label>
              <input
                type="text"
                value={salespersonName}
                onChange={(e) => onSalespersonNameChange(e.target.value)}
                placeholder="e.g. Rahul Patel"
                className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl typo-input text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1677E8] shadow-2xs h-9"
              />
            </div>
          )}

          {onMrnNumberChange && (
            <div className="space-y-1">
              <label className="typo-label text-slate-600 block">MRN No. (Material Receipt)</label>
              <input
                type="text"
                value={mrnNumber}
                onChange={(e) => onMrnNumberChange(e.target.value)}
                placeholder="e.g. MRN/26-27/001"
                className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl typo-input text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1677E8] shadow-2xs h-9"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
