"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "../../lib/api-client";
import { Modal } from "../ui/modal";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

interface EwbSlipModalProps {
  ewbNumber: string | null;
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated?: () => void;
  onCancelled?: () => void;
}

export function EwbSlipModal({
  ewbNumber,
  isOpen,
  onClose,
  onVehicleUpdated,
  onCancelled,
}: EwbSlipModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  // Vehicle Update modal state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [newVehicleNumber, setNewVehicleNumber] = useState("");
  const [vehicleReasonCode, setVehicleReasonCode] = useState("1");
  const [vehicleRemarks, setVehicleRemarks] = useState("");
  const [isUpdatingVehicle, setIsUpdatingVehicle] = useState(false);
  const [vehicleUpdateError, setVehicleUpdateError] = useState<string | null>(null);

  // Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonCode, setCancelReasonCode] = useState("1");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !ewbNumber) {
      setData(null);
      setError(null);
      setQrDataUrl("");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    apiClient
      .get<any>(`/gst/eway-bills/${ewbNumber}/details`)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setIsLoading(false);

        // Generate QR code
        const qrString = `EWB:${res.record?.ewbNumber}|SUPP:${res.supplier?.gstin}|REC:${res.recipient?.gstin}|DOC:${res.document?.number}|VAL:${res.document?.totalAmount}|VEH:${res.record?.vehicleNumber || "NONE"}`;
        QRCode.toDataURL(qrString, { width: 140, margin: 1 })
          .then((url) => {
            if (isMounted) setQrDataUrl(url);
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load E-Way Bill details.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, ewbNumber]);

  // Generate barcode when modal data loads
  useEffect(() => {
    if (data?.record?.ewbNumber && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, String(data.record.ewbNumber), {
          format: "CODE128",
          width: 1.8,
          height: 40,
          displayValue: false,
          margin: 0,
        });
      } catch {
        // ignore barcode rendering error
      }
    }
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!data?.nicPayload) return;
    const blob = new Blob([JSON.stringify(data.nicPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EWB-${data.record?.ewbNumber || "payload"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewbNumber || !newVehicleNumber) return;
    setIsUpdatingVehicle(true);
    setVehicleUpdateError(null);
    try {
      await apiClient.post(`/gst/eway-bills/${ewbNumber}/vehicle`, {
        vehicleNumber: newVehicleNumber.toUpperCase().trim(),
        reasonCode: vehicleReasonCode,
        remarks: vehicleRemarks || undefined,
      });
      setIsVehicleModalOpen(false);
      setNewVehicleNumber("");
      // Refresh current details
      const refreshed = await apiClient.get<any>(`/gst/eway-bills/${ewbNumber}/details`);
      setData(refreshed);
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err: any) {
      setVehicleUpdateError(err.message || "Failed to update vehicle number.");
    } finally {
      setIsUpdatingVehicle(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewbNumber) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await apiClient.post(`/gst/eway-bills/${ewbNumber}/cancel`, {
        reasonCode: cancelReasonCode,
        remarks: cancelRemarks || "Cancelled by user",
      });
      setIsCancelModalOpen(false);
      setCancelRemarks("");
      // Refresh current details
      const refreshed = await apiClient.get<any>(`/gst/eway-bills/${ewbNumber}/details`);
      setData(refreshed);
      if (onCancelled) onCancelled();
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel E-Way Bill.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`E-Way Bill: ${ewbNumber || ""}`}
        titleGujarati="સરકારી માન્ય ફોર્મ GST EWB-01 સ્લિપ"
        maxWidth="4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={!data?.nicPayload}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download NIC JSON
              </button>

              {data?.record?.status === "ACT" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setNewVehicleNumber(data.record?.vehicleNumber || "");
                      setVehicleUpdateError(null);
                      setIsVehicleModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Update Vehicle (Part-B)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCancelError(null);
                      setIsCancelModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    Cancel EWB (24h)
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Official Slip
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <div className="inline-block w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Loading Form GST EWB-01 compliance record...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <span className="font-bold">Error:</span> {error}
          </div>
        ) : data ? (
          <div className="bg-white p-4 sm:p-6 rounded-lg text-slate-900 text-xs font-sans print:p-0 print:m-0 print:border-none print:shadow-none">
            {/* STATUTORY SLIP CONTAINER */}
            <div className="border-2 border-slate-900 p-4 rounded-md space-y-4 print:border-black print:p-2">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600">
                  Government of India
                </div>
                <div className="text-base sm:text-lg font-black tracking-wide text-slate-900">
                  FORM GST EWB-01
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  (See Rule 138 of the Central Goods and Services Tax Rules, 2017)
                </div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-0.5">
                  e-Way Bill Slip
                </div>
              </div>

              {/* Status & Barcode Header Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-300 rounded print:bg-white print:border-black">
                <div className="space-y-1.5 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">e-Way Bill No:</span>
                    <span className="text-base font-mono font-black text-slate-900 tracking-wider">
                      {data.record?.ewbNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        data.record?.status === "ACT"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {data.record?.status === "ACT" ? "Active / Valid" : "Cancelled"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
                    <div>
                      <span className="font-medium text-slate-500">e-Way Bill Date: </span>
                      <span className="font-semibold">
                        {new Date(data.record?.ewbDate).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Generated By: </span>
                      <span className="font-semibold font-mono">
                        {data.supplier?.gstin} - {data.supplier?.tradeName || data.supplier?.legalName}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Valid From: </span>
                      <span className="font-semibold">
                        {new Date(data.record?.ewbDate).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Valid Until: </span>
                      <span className="font-bold text-indigo-700">
                        {new Date(data.record?.validUpto).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code and Barcode */}
                <div className="flex items-center gap-3 shrink-0">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="GST Verification QR"
                      className="w-20 h-20 border border-slate-300 rounded p-1 bg-white print:border-black"
                    />
                  )}
                  <div className="flex flex-col items-center">
                    <svg ref={barcodeRef} className="w-36 h-10" />
                    <span className="text-[9px] font-mono font-semibold tracking-widest text-slate-700">
                      {data.record?.ewbNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* PART-A */}
              <div className="space-y-2">
                <div className="bg-slate-800 text-white font-bold px-2.5 py-1 text-[11px] tracking-wider uppercase rounded-sm print:bg-black print:text-white">
                  PART - A (Consignment & Tax Details)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-slate-300 rounded p-3 text-[11px]">
                  {/* From (Consignor) */}
                  <div className="space-y-1 pr-2 border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0">
                    <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
                      1. Details of Consignor (From / Sender)
                    </div>
                    <div className="font-bold text-slate-900 text-xs">
                      {data.supplier?.legalName}
                    </div>
                    {data.supplier?.tradeName && data.supplier?.tradeName !== data.supplier?.legalName && (
                      <div className="text-slate-600 font-medium">Trade: {data.supplier?.tradeName}</div>
                    )}
                    <div className="font-mono font-bold text-indigo-900">
                      GSTIN: {data.supplier?.gstin || "URP"}
                    </div>
                    <div className="text-slate-600 leading-snug">
                      {data.supplier?.address}, {data.supplier?.city} - {data.supplier?.pincode}
                    </div>
                    <div className="text-slate-600">
                      State: State Code ({data.supplier?.stateCode})
                    </div>
                  </div>

                  {/* To (Consignee) */}
                  <div className="space-y-1 pl-0 md:pl-2">
                    <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
                      2. Details of Consignee (To / Recipient)
                    </div>
                    <div className="font-bold text-slate-900 text-xs">
                      {data.recipient?.legalName}
                    </div>
                    <div className="font-mono font-bold text-indigo-900">
                      GSTIN: {data.recipient?.gstin || "URP"}
                    </div>
                    <div className="text-slate-600 leading-snug">
                      {data.recipient?.address}
                    </div>
                    <div className="text-slate-600">
                      Place of Delivery: {data.recipient?.city} (State Code: {data.recipient?.stateCode})
                    </div>
                  </div>
                </div>

                {/* Document & Movement Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 border border-slate-300 rounded text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">Document Type</span>
                    <span className="font-bold text-slate-800">{data.document?.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">Document No. & Date</span>
                    <span className="font-mono font-bold text-slate-900">{data.document?.number}</span>
                    <span className="text-[10px] text-slate-600 block">
                      {new Date(data.document?.date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">Reason For Transport</span>
                    <span className="font-bold text-slate-800">
                      {data.document?.type === "Delivery Challan" ? "Job Work / Approval" : "Outward Supply (Sale)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">Total Movement Value</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      ₹{Number(data.document?.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Items Summary Table */}
                <div className="overflow-x-auto border border-slate-300 rounded">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <tr>
                        <th className="p-2 border-r border-slate-200">#</th>
                        <th className="p-2 border-r border-slate-200">HSN Code</th>
                        <th className="p-2 border-r border-slate-200">Item / Goods Description</th>
                        <th className="p-2 text-right border-r border-slate-200">Quantity</th>
                        <th className="p-2 text-right border-r border-slate-200">Taxable Value (₹)</th>
                        <th className="p-2 text-right border-r border-slate-200">Tax Rates</th>
                        <th className="p-2 text-right">Total Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 text-center text-slate-500 font-mono border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-mono font-bold text-slate-800 border-r border-slate-200">
                            {item.hsnCode}
                          </td>
                          <td className="p-2 font-medium text-slate-900 border-r border-slate-200">
                            {item.productName}
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-200">
                            {item.quantity} {item.unit || "PCS"}
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-200">
                            {Number(item.taxableAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-mono text-[10px] border-r border-slate-200">
                            {item.taxRate}% {item.igstAmount > 0 ? "IGST" : "GST"}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {Number(item.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                      <tr>
                        <td colSpan={4} className="p-2 text-right">
                          Consignment Totals:
                        </td>
                        <td className="p-2 text-right font-mono">
                          ₹{Number(data.document?.taxableAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-[10px] text-slate-600">
                          CGST: ₹{Number(data.document?.cgstAmount || 0).toFixed(2)} | SGST: ₹{Number(data.document?.sgstAmount || 0).toFixed(2)}
                          {data.document?.igstAmount > 0 && ` | IGST: ₹${Number(data.document?.igstAmount).toFixed(2)}`}
                        </td>
                        <td className="p-2 text-right font-mono font-black text-sm">
                          ₹{Number(data.document?.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* PART-B */}
              <div className="space-y-2 pt-2">
                <div className="bg-slate-800 text-white font-bold px-2.5 py-1 text-[11px] tracking-wider uppercase rounded-sm print:bg-black print:text-white">
                  PART - B (Vehicle & Transport Details)
                </div>

                <div className="overflow-x-auto border border-slate-300 rounded">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <tr>
                        <th className="p-2 border-r border-slate-200">Mode</th>
                        <th className="p-2 border-r border-slate-200">Vehicle Number</th>
                        <th className="p-2 border-r border-slate-200">From Place</th>
                        <th className="p-2 border-r border-slate-200">Entered Date & Time</th>
                        <th className="p-2 border-r border-slate-200">Transporter Doc No. & Date</th>
                        <th className="p-2">Transporter ID / Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border-r border-slate-200 font-semibold text-slate-800">
                          {data.record?.mode || "Road"} (1)
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-indigo-900 text-xs">
                          {data.record?.vehicleNumber || "NOT ASSIGNED (PART-A ONLY)"}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-700">
                          {data.supplier?.city} ({data.record?.distanceKm || 50} KM)
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-[10px] text-slate-600">
                          {new Date(data.record?.ewbDate).toLocaleString("en-IN")}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-600">
                          {data.record?.transporterDocNo || "—"}
                        </td>
                        <td className="p-2 text-slate-800">
                          {data.record?.transporterName || data.record?.transporterId || "Direct Transport"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statutory Footer Verification */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
                <div>
                  <span className="font-semibold text-slate-700">Statutory Notice: </span>
                  This document is generated in compliance with Section 68 of CGST Act read with Rule 138.
                </div>
                <div className="font-mono">
                  Environment: {data.record?.environment || "PORTAL"} | ID: {data.record?.id?.slice(0, 8)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Vehicle Update Modal */}
      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        title="Update Vehicle Number (Part-B)"
        titleGujarati="વાહન નંબર અપડેટ કરો (Rule 138/Part B)"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsVehicleModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="vehicle-update-form"
              disabled={isUpdatingVehicle}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              {isUpdatingVehicle ? "Updating..." : "Confirm Vehicle Update"}
            </button>
          </div>
        }
      >
        <form id="vehicle-update-form" onSubmit={handleUpdateVehicleSubmit} className="space-y-3">
          <p className="text-xs text-slate-600">
            Under Rule 138(5), Part-B vehicle details can be updated in case of transshipment or breakdown.
          </p>

          {vehicleUpdateError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
              {vehicleUpdateError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Vehicle Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newVehicleNumber}
              onChange={(e) => setNewVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. GJ01AB1234"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Vehicle Change
            </label>
            <select
              value={vehicleReasonCode}
              onChange={(e) => setVehicleReasonCode(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="1">1 - Due to vehicle breakdown</option>
              <option value="2">2 - Due to transshipment</option>
              <option value="3">3 - Others</option>
              <option value="4">4 - First time vehicle update</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks (Optional)
            </label>
            <input
              type="text"
              value={vehicleRemarks}
              onChange={(e) => setVehicleRemarks(e.target.value)}
              placeholder="e.g. Transshipped at Ahmedabad Hub"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
            />
          </div>
        </form>
      </Modal>

      {/* Cancel E-Way Bill Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel E-Way Bill"
        titleGujarati="ઈ-વે બિલ રદ કરો (૨૪ કલાકની સમયમર્યાદા)"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg"
            >
              Back
            </button>
            <button
              type="submit"
              form="ewb-cancel-form"
              disabled={isCancelling}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        }
      >
        <form id="ewb-cancel-form" onSubmit={handleCancelSubmit} className="space-y-3">
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs leading-relaxed">
            ⚠️ <strong>Statutory 24-Hour Rule:</strong> Under Rule 138(9), an e-way bill can only be cancelled within 24 hours of generation provided goods are not in transit or verified in inspection.
          </div>

          {cancelError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
              {cancelError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason Code
            </label>
            <select
              value={cancelReasonCode}
              onChange={(e) => setCancelReasonCode(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-rose-500"
            >
              <option value="1">1 - Duplicate E-Way Bill</option>
              <option value="2">2 - Order Cancelled by Buyer/Seller</option>
              <option value="3">3 - Data Entry Error</option>
              <option value="4">4 - Others</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="State the reason for cancellation..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
