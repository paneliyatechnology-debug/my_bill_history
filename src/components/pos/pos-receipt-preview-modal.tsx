"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  Check,
  X,
  Share2,
  Bluetooth,
  ArrowRight,
  Receipt,
  RotateCcw,
  Sparkles,
  Usb,
  Zap,
  ChevronDown,
  Info,
  HelpCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  ThermalReceiptData,
  ThermalPrintSettings,
  getCachedThermalSettings,
  executeThermalPrint,
  printViaBluetoothPos,
  printViaWebUsb,
  printViaWebSerial,
  generateUpiQrDataUrl,
} from "../../lib/thermal-printer";

export interface PosReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ThermalReceiptData | null;
  onNewBill?: () => void;
  autoPrint?: boolean;
  lang?: "en" | "gu";
}

export function PosReceiptPreviewModal({
  isOpen,
  onClose,
  receiptData,
  onNewBill,
  autoPrint = false,
  lang = "en",
}: PosReceiptPreviewModalProps) {
  const [settings, setSettings] = useState<ThermalPrintSettings>(() =>
    getCachedThermalSettings()
  );
  const [paperSize, setPaperSize] = useState<"2inch" | "3inch">(
    settings.paperSize || "3inch"
  );
  const [upiQrUrl, setUpiQrUrl] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [isBtPrinting, setIsBtPrinting] = useState(false);
  const [isUsbPrinting, setIsUsbPrinting] = useState(false);
  const [isSerialPrinting, setIsSerialPrinting] = useState(false);
  const [hardwareStatus, setHardwareStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [showHardwareMenu, setShowHardwareMenu] = useState(false);
  const [showKioskGuide, setShowKioskGuide] = useState(false);

  const printButtonRef = useRef<HTMLButtonElement | null>(null);

  // Sync settings when opened
  useEffect(() => {
    if (isOpen) {
      const current = getCachedThermalSettings();
      setSettings(current);
      setPaperSize(current.paperSize || "3inch");
      setPrintSuccess(false);
      setHardwareStatus(null);
      setShowHardwareMenu(false);
    }
  }, [isOpen]);

  // Generate UPI QR Code
  useEffect(() => {
    if (!isOpen || !receiptData) return;
    let cancelled = false;

    if (settings.showUpiQr && receiptData.upiId) {
      generateUpiQrDataUrl(
        receiptData.upiId,
        receiptData.companyName,
        receiptData.grandTotal
      )
        .then((url) => {
          if (!cancelled) setUpiQrUrl(url);
        })
        .catch(() => {
          if (!cancelled) setUpiQrUrl("");
        });
    } else {
      setUpiQrUrl("");
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, receiptData, settings.showUpiQr]);

  // Auto-focus print button and handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      printButtonRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseModal();
      } else if (e.key === "Enter" && !isPrinting) {
        e.preventDefault();
        handleThermalPrint();
      } else if (e.key === "F6") {
        e.preventDefault();
        handleThermalPrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, receiptData, settings, paperSize, isPrinting]);

  // Optional auto-print on open
  useEffect(() => {
    if (isOpen && autoPrint && receiptData) {
      const t = setTimeout(() => {
        handleThermalPrint();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen || !receiptData) return null;

  const activeSettings: ThermalPrintSettings = {
    ...settings,
    paperSize,
  };

  const is2Inch = paperSize === "2inch";

  const handleThermalPrint = async () => {
    if (!receiptData || isPrinting) return;
    setIsPrinting(true);
    setPrintSuccess(false);
    try {
      await executeThermalPrint(receiptData, activeSettings);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 2500);
    } catch (err) {
      console.error("POS thermal print error:", err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Direct USB ESC/POS Print (DMart / Supermarket Hardware Method)
  const handleUsbPrint = async () => {
    if (!receiptData || isUsbPrinting) return;
    setIsUsbPrinting(true);
    setHardwareStatus({
      type: "info",
      message:
        lang === "gu"
          ? "USB થર્મલ પ્રિન્ટર સાથે જોડાઈ રહ્યું છે..."
          : "Connecting to Direct USB Thermal Printer...",
    });
    try {
      const res = await printViaWebUsb(receiptData, activeSettings);
      if (res.success) {
        setHardwareStatus({
          type: "success",
          message:
            lang === "gu"
              ? `ડાયરેક્ટ USB પ્રિન્ટ મોકલાઈ ગઈ! (${res.deviceName || "TVS/Epson"} - ઓટો પેપર કટ ✓)`
              : `Direct USB Print sent successfully! (${res.deviceName || "Thermal Printer"} - Auto-cut ✓)`,
        });
        setTimeout(() => setHardwareStatus(null), 4500);
      } else {
        setHardwareStatus({
          type: "error",
          message:
            res.error ||
            (lang === "gu"
              ? "USB કનેક્શન ન મળ્યું. સ્ટાન્ડર્ડ થર્મલ પ્રિન્ટ ઉપયોગ કરી રહ્યા છીએ."
              : "USB Printer not selected. Triggering standard thermal print."),
        });
        await executeThermalPrint(receiptData, activeSettings);
      }
    } catch (err: any) {
      setHardwareStatus({
        type: "error",
        message: err.message || "Failed to print to USB.",
      });
      await executeThermalPrint(receiptData, activeSettings);
    } finally {
      setIsUsbPrinting(false);
    }
  };

  // Direct Serial / Virtual COM Port Print
  const handleSerialPrint = async () => {
    if (!receiptData || isSerialPrinting) return;
    setIsSerialPrinting(true);
    setHardwareStatus({
      type: "info",
      message:
        lang === "gu"
          ? "COM/Serial પોર્ટ પર ડેટા મોકલી રહ્યું છે..."
          : "Sending ESC/POS to COM / Serial port...",
    });
    try {
      const res = await printViaWebSerial(receiptData, activeSettings);
      if (res.success) {
        setHardwareStatus({
          type: "success",
          message:
            lang === "gu"
              ? "COM પોર્ટ ડાયરેક્ટ પ્રિન્ટ સફળ! ✓"
              : "Direct print sent to COM Port successfully! ✓",
        });
        setTimeout(() => setHardwareStatus(null), 4000);
      } else {
        setHardwareStatus({
          type: "error",
          message: res.error || "COM Port print failed.",
        });
      }
    } catch (err: any) {
      setHardwareStatus({
        type: "error",
        message: err.message || "COM Port error.",
      });
    } finally {
      setIsSerialPrinting(false);
    }
  };

  // Mobile / Handheld Bluetooth Print
  const handleBluetoothPrint = async () => {
    if (!receiptData || isBtPrinting) return;
    setIsBtPrinting(true);
    setHardwareStatus({
      type: "info",
      message:
        lang === "gu"
          ? "બ્લૂટૂથ પ્રિન્ટર શોધી રહ્યું છે..."
          : "Searching for Bluetooth portable printer...",
    });
    try {
      const res = await printViaBluetoothPos(receiptData, activeSettings);
      if (res.success) {
        setHardwareStatus({
          type: "success",
          message:
            lang === "gu"
              ? "બ્લૂટૂથ પ્રિન્ટ મોકલાઈ ગઈ! ✓"
              : "Bluetooth print sent successfully! ✓",
        });
        setTimeout(() => setHardwareStatus(null), 4000);
      } else {
        setHardwareStatus({
          type: "error",
          message:
            res.error ||
            (lang === "gu"
              ? "ડેસ્કટોપ પર બ્લૂટૂથ નથી. સ્ટાન્ડર્ડ થર્મલ પ્રિન્ટ ઉપયોગ કરો."
              : "Bluetooth not available on PC. Fallback to standard thermal print."),
        });
        await executeThermalPrint(receiptData, activeSettings);
      }
    } catch (err: any) {
      setHardwareStatus({
        type: "error",
        message: err.message || "Bluetooth error.",
      });
      await executeThermalPrint(receiptData, activeSettings);
    } finally {
      setIsBtPrinting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!receiptData) return;
    const phone = (receiptData.customerPhone || "").replace(/\D/g, "");
    const store = receiptData.companyName || "Store";
    const billNo = receiptData.invoiceNumber || "";
    const total = Number(receiptData.grandTotal || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    });

    const itemsSummary = (receiptData.items || [])
      .map((it) => `• ${it.name} (${it.quantity} x ₹${it.rate}) = ₹${it.amount}`)
      .join("\n");

    const message = encodeURIComponent(
      `🧾 *Bill Receipt from ${store}*\n` +
        `Invoice No: *#${billNo}*\n` +
        `Date: ${receiptData.invoiceDate} ${receiptData.invoiceTime || ""}\n\n` +
        `*Items:*\n${itemsSummary}\n\n` +
        `*Grand Total: ₹${total}*\n` +
        `Payment Mode: ${receiptData.paymentMode || "Cash"}\n\n` +
        `Thank you for your business! Please visit again.`
    );

    const waUrl = phone
      ? `https://api.whatsapp.com/send?phone=91${phone}&text=${message}`
      : `https://api.whatsapp.com/send?text=${message}`;

    window.open(waUrl, "_blank");
  };

  const handleCloseModal = () => {
    onClose();
    if (onNewBill) {
      onNewBill();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseModal();
      }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {lang === "gu"
                    ? "બિલ સફળતાપૂર્વક બન્યું"
                    : "Bill Created Successfully"}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  #{receiptData.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === "gu"
                  ? "થર્મલ પ્રિન્ટ પ્રિવ્યૂ અને પ્રિન્ટ વિકલ્પ"
                  : "Thermal Receipt Preview & Instant Print"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Size Quick Toggle */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-medium text-slate-700">
              <button
                type="button"
                onClick={() => setPaperSize("3inch")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === "3inch"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3" (80mm)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize("2inch")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === "2inch"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2" (58mm)
              </button>
            </div>

            <button
              type="button"
              onClick={handleCloseModal}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="Close [Esc]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Scrollable Thermal Paper Slip Preview */}
        <div className="flex-1 bg-[#E8EBF0] p-4 sm:p-6 overflow-y-auto flex justify-center items-start border-b border-slate-200">
          <div
            className={`bg-white text-black shadow-lg border border-slate-300 p-4 sm:p-5 tabular-nums space-y-1.5 transition-all select-text rounded-xs ${
              is2Inch
                ? "w-[260px] max-w-[260px] text-[9.5px]"
                : "w-[330px] max-w-[330px] text-[10.5px]"
            }`}
            style={{
              fontFamily:
                "'Courier New', Courier, 'Lucida Console', Monaco, monospace",
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5">
              {receiptData.companyLogoUrl && (
                <div className="flex justify-center mb-1">
                  <img
                    src={receiptData.companyLogoUrl}
                    alt="Logo"
                    className="max-h-9 max-w-[110px] object-contain filter grayscale contrast-150"
                  />
                </div>
              )}
              <p className="font-bold text-sm uppercase tracking-tight text-black">
                {receiptData.companyName || "STORE RECEIPT"}
              </p>
              {receiptData.companyAddress && (
                <p className="text-[9px] text-black leading-tight">
                  {receiptData.companyAddress}
                </p>
              )}
              {receiptData.companyPhone && (
                <p className="text-[9px] text-black">
                  Phone: <b>{receiptData.companyPhone}</b>
                </p>
              )}
              {activeSettings.showGstin && receiptData.companyGstin && (
                <p className="text-[9px] text-black">
                  GSTIN: <b>{receiptData.companyGstin}</b>
                </p>
              )}
              {receiptData.companyFssai && (
                <p className="text-[8.5px] text-black">
                  FSSAI: {receiptData.companyFssai}
                </p>
              )}
              {activeSettings.customHeader && (
                <p className="text-[8.5px] italic text-black">
                  {activeSettings.customHeader}
                </p>
              )}
            </div>

            <div className="border-t-2 border-black my-1" />
            <p className="text-center font-bold text-xs uppercase tracking-wider text-black">
              TAX INVOICE / CASH BILL
            </p>
            <div className="border-t border-dashed border-black my-1" />

            {/* Bill Details */}
            <div className="space-y-0.5 text-[9.5px]">
              <div className="flex justify-between font-bold">
                <span>Invoice No :</span>
                <span>{receiptData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date : {receiptData.invoiceDate}</span>
                {activeSettings.showTime && (
                  <span>Time : {receiptData.invoiceTime || "12:00"}</span>
                )}
              </div>
              {receiptData.cashierName && (
                <div className="flex justify-between text-[9px]">
                  <span>Cashier :</span>
                  <span>{receiptData.cashierName}</span>
                </div>
              )}
              {receiptData.customerName && (
                <p className="font-bold text-black pt-0.5 truncate">
                  Bill To : {receiptData.customerName}
                </p>
              )}
              {activeSettings.showCustomerPhone !== false &&
                receiptData.customerPhone && (
                  <p className="text-[9px]">
                    Phone : {receiptData.customerPhone}
                  </p>
                )}
            </div>

            <div className="border-t border-black my-1" />

            {/* Items Table Header */}
            <div className="grid grid-cols-12 font-bold text-[9px] border-b border-black pb-0.5">
              <span className="col-span-1">#</span>
              <span className="col-span-5">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              {activeSettings.showRate && (
                <span className="col-span-2 text-right">Rate</span>
              )}
              <span
                className={`${
                  activeSettings.showRate ? "col-span-2" : "col-span-4"
                } text-right`}
              >
                Amt
              </span>
            </div>

            {/* Items Rows */}
            <div className="space-y-1 py-0.5 text-[9px]">
              {receiptData.items.map((it, idx) => (
                <div key={idx}>
                  <div className="grid grid-cols-12 font-bold">
                    <span className="col-span-1">{idx + 1}</span>
                    <span className="col-span-5 truncate">{it.name}</span>
                    <span className="col-span-2 text-center">
                      {it.quantity} {it.unit || ""}
                    </span>
                    {activeSettings.showRate && (
                      <span className="col-span-2 text-right">
                        {Number(it.rate || 0).toLocaleString("en-IN")}
                      </span>
                    )}
                    <span
                      className={`${
                        activeSettings.showRate ? "col-span-2" : "col-span-4"
                      } text-right`}
                    >
                      {Number(it.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {activeSettings.showItemDesc && (it.description || it.hsn) && (
                    <div className="text-[8px] text-black pl-3 leading-tight">
                      {it.description && <p>Desc: {it.description}</p>}
                      {activeSettings.showHsn && it.hsn && (
                        <p>
                          HSN: {it.hsn}
                          {Number(it.discount || 0) > 0
                            ? `, Disc: ${it.discount}%`
                            : ""}
                          {Number(it.taxPercent || 0) > 0
                            ? `, GST: ${it.taxPercent}%`
                            : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-black my-1" />

            {/* Totals Section */}
            <div className="space-y-0.5 text-[9px]">
              <div className="flex justify-between font-bold">
                <span>Sub Total ({receiptData.items.length})</span>
                <span>
                  ₹{" "}
                  {Number(receiptData.subTotal || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {Number(receiptData.discountTotal || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>
                    - ₹{" "}
                    {Number(receiptData.discountTotal || 0).toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2 }
                    )}
                  </span>
                </div>
              )}
              {Number(receiptData.taxTotal || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Total Tax (GST)</span>
                  <span>
                    ₹{" "}
                    {Number(receiptData.taxTotal || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              {Number(receiptData.roundOff || 0) !== 0 && (
                <div className="flex justify-between">
                  <span>Round Off</span>
                  <span>
                    ₹{" "}
                    {Number(receiptData.roundOff || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-1" />

            {/* GRAND TOTAL */}
            <div className="space-y-0.5">
              <div className="flex justify-between font-extrabold text-xs">
                <span>TOTAL AMOUNT</span>
                <span>
                  ₹{" "}
                  {Number(receiptData.grandTotal || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {activeSettings.showSavings &&
                Number(receiptData.youSaved || 0) > 0 && (
                  <div className="flex justify-between font-bold bg-black text-white px-1 py-0.5 my-0.5 text-[9px]">
                    <span>YOU SAVED</span>
                    <span>
                      ₹{" "}
                      {Number(receiptData.youSaved).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

              <div className="flex justify-between text-[9px]">
                <span>
                  Received ({receiptData.paymentMode || "Cash"})
                </span>
                <span>
                  ₹{" "}
                  {Number(receiptData.receivedAmount || 0).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </div>

              {Number(receiptData.changeDue || 0) > 0 && (
                <div className="flex justify-between text-[9px] font-bold text-black">
                  <span>Change Due :</span>
                  <span>
                    ₹{" "}
                    {Number(receiptData.changeDue).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              {Number(receiptData.balanceAmount || 0) > 0 && (
                <div className="flex justify-between text-[9px] font-bold text-black">
                  <span>Balance Due :</span>
                  <span>
                    ₹{" "}
                    {Number(receiptData.balanceAmount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* UPI QR CODE */}
            {activeSettings.showUpiQr && upiQrUrl && (
              <>
                <div className="border-t border-dashed border-black my-1" />
                <div className="text-center py-1">
                  <img
                    src={upiQrUrl}
                    alt="Scan UPI QR"
                    className="mx-auto border border-black p-0.5 bg-white"
                    style={{
                      width: is2Inch ? "84px" : "104px",
                      height: is2Inch ? "84px" : "104px",
                    }}
                  />
                  <p className="text-[8.5px] font-bold mt-0.5">
                    SCAN TO PAY VIA UPI
                  </p>
                  {receiptData.upiId && (
                    <p className="text-[7.5px]">{receiptData.upiId}</p>
                  )}
                </div>
              </>
            )}

            {/* Notes & Terms */}
            {activeSettings.showNotes && receiptData.notes && (
              <div className="border-t border-black my-1 pt-0.5 text-[8.5px]">
                <p className="font-bold">Note:</p>
                <p>{receiptData.notes}</p>
              </div>
            )}

            {activeSettings.showTerms && (
              <div className="border-t border-dashed border-black my-1 pt-0.5 text-[8px] space-y-0.5">
                <p className="font-bold">Terms & Conditions:</p>
                <p>1. Goods once sold will not be returned or exchanged.</p>
                <p>2. Thank you for your business! Visit again.</p>
              </div>
            )}

            {activeSettings.customFooter && (
              <p className="text-center text-[8.5px] font-semibold pt-1 border-t border-black">
                {activeSettings.customFooter}
              </p>
            )}

            {/* Cutter Space */}
            <div
              style={{ height: activeSettings.autoCut ? "14mm" : "8mm" }}
              className="w-full"
            />
          </div>
        </div>

        {/* Bottom Options & Action Bar */}
        <div className="p-3.5 sm:p-4 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Direct USB Print (DMart / Supermarket Direct ESC/POS) */}
            <button
              type="button"
              onClick={handleUsbPrint}
              disabled={isUsbPrinting}
              className="h-9.5 px-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Print directly to TVS/Epson/Everycom USB Thermal Printer (No print dialog - Auto-cut)"
            >
              <Usb className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {isUsbPrinting
                  ? lang === "gu"
                    ? "મોકલી રહ્યું છે..."
                    : "Printing USB..."
                  : lang === "gu"
                  ? "ડાયરેક્ટ USB (મોલ સ્ટાઇલ)"
                  : "Direct USB (ESC/POS)"}
              </span>
            </button>

            {/* 2. DMart / Supermarket Instant Kiosk Guide */}
            <button
              type="button"
              onClick={() => setShowKioskGuide(true)}
              className="h-9.5 px-3 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Setup 0.1s instant silent print without browser print dialog (like DMart / JioMart)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === "gu" ? "મોલ સેટઅપ (DMart)" : "Mall Setup (0.1s)"}</span>
            </button>

            {/* 3. Hardware Options Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHardwareMenu((prev) => !prev)}
                className="h-9.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="More printer connections (COM port, Bluetooth, Kiosk Setup)"
              >
                <span>{lang === "gu" ? "અન્ય પ્રિન્ટર" : "More Ports"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showHardwareMenu && (
                <div
                  className="absolute bottom-full mb-1.5 left-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs"
                  onClick={() => setShowHardwareMenu(false)}
                >
                  <button
                    type="button"
                    onClick={handleSerialPrint}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-semibold">
                        {lang === "gu" ? "COM / Serial પોર્ટ" : "COM / Serial Port"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Virtual COM1-COM9 ESC/POS
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleBluetoothPrint}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Bluetooth className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="font-semibold">
                        {lang === "gu" ? "બ્લૂટૂથ POS (મોબાઇલ / ટેબ)" : "Bluetooth POS (Mobile)"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Portable Handheld Battery Printers
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => setShowKioskGuide(true)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50/60 flex items-center gap-2 text-blue-700"
                  >
                    <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold">
                        {lang === "gu"
                          ? "DMart જેવી સાયલન્ટ પ્રિન્ટ સેટિંગ"
                          : "DMart 0.1s Silent Kiosk Guide"}
                      </div>
                      <div className="text-[10px] text-blue-500">
                        Instant zero-dialog print on Enter
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. WhatsApp Share */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="h-9.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Share receipt summary on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* New Bill / Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="h-10 px-3.5 sm:px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>{lang === "gu" ? "નવું બિલ [Esc]" : "New Bill [Esc]"}</span>
            </button>

            {/* PRIMARY THERMAL PRINT BUTTON */}
            <button
              ref={printButtonRef}
              type="button"
              onClick={handleThermalPrint}
              disabled={isPrinting}
              className={`h-10 px-5 sm:px-6 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 ${
                printSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isPrinting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{lang === "gu" ? "પ્રિન્ટ થાય છે..." : "Printing..."}</span>
                </>
              ) : printSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{lang === "gu" ? "પ્રિન્ટ મોકલાઈ ગઈ!" : "Printed!"}</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>
                    {lang === "gu"
                      ? "થર્મલ પ્રિન્ટ [Enter]"
                      : "Thermal Print [Enter]"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Hardware Feedback Toast */}
        {hardwareStatus && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between border-t transition-all ${
              hardwareStatus.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : hardwareStatus.type === "error"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {hardwareStatus.type === "success" && (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              )}
              {hardwareStatus.type === "error" && (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              {hardwareStatus.type === "info" && (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{hardwareStatus.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setHardwareStatus(null)}
              className="p-1 hover:opacity-75"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SUPERMARKET SILENT KIOSK PRINT GUIDE MODAL */}
        {showKioskGuide && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowKioskGuide(false);
            }}
          >
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
                    POS
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {lang === "gu"
                        ? "DMart / JioMart જેવી 0.1s સાયલન્ટ પ્રિન્ટ સેટિંગ"
                        : "DMart & JioMart 0.1s Silent Kiosk Print Setup"}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {lang === "gu"
                        ? "કોઈપણ પ્રિન્ટ ડાયલોગ વગર સીધી 1-ક્લિક પ્રિન્ટ કઈ રીતે થાય?"
                        : "How supermarkets print receipts in 0.1s with zero dialogs"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKioskGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                <p>
                  {lang === "gu"
                    ? "મોટા મોલ (DMart, Reliance, JioMart) માં કેશિયરને ક્યારેય વિન્ડોઝનો પ્રિન્ટ પ્રિવ્યૂ ડાયલોગ પૂછતો નથી. બિલ બનાવતા જ પ્રિન્ટરમાંથી રસીદ નીકળીને પેપર કટ થઈ જાય છે."
                    : "In large malls (DMart, Reliance, JioMart), cashiers never see a browser print popup. Receipts print instantaneously as soon as Enter is pressed."}
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <p className="font-bold text-slate-800">
                    {lang === "gu"
                      ? "આ સેટિંગ કમ્પ્યુટરમાં કરવાના 3 સરળ સ્ટેપ:"
                      : "3 Quick Steps to Enable Supermarket Silent Print:"}
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-700">
                    <li>
                      <b>{lang === "gu" ? "પ્રિન્ટરને USB થી જોડો:" : "Connect Printer via USB:"}</b>{" "}
                      {lang === "gu"
                        ? "તમારું TVS / Epson / Everycom થર્મલ પ્રિન્ટર USB કેબલથી જોડો."
                        : "Plug your 80mm/58mm thermal printer with a USB cable."}
                    </li>
                    <li>
                      <b>{lang === "gu" ? "ડિફૉલ્ટ પ્રિન્ટર બનાવો:" : "Set as Default Printer:"}</b>{" "}
                      {lang === "gu"
                        ? "Windows Settings > Printers & Scanners માં જઈને તમારા થર્મલ પ્રિન્ટરને 'Set as Default' કરો."
                        : "Go to Windows Settings > Printers, and set your Thermal Printer as Default."}
                    </li>
                    <li>
                      <b>{lang === "gu" ? "Chrome Kiosk Print ફ્લેગ:" : "Launch Chrome with Kiosk Print:"}</b>{" "}
                      {lang === "gu"
                        ? "Chrome શૉર્ટકટ પર રાઈટ-ક્લિક > Properties > Target માં છેલ્લે આ ઉમેરો:"
                        : "Right-click your Chrome shortcut > Properties > Target, and append:"}
                      <code className="block mt-1 p-2 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono select-all">
                        --kiosk-printing
                      </code>
                    </li>
                  </ol>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-900 text-[11px] flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {lang === "gu"
                      ? "આ સેટ કર્યા પછી, ફક્ત [Enter] દબાવતા જ 0.1 સેકન્ડમાં પ્રિન્ટ સીધી બહાર આવશે!"
                      : "Once configured, pressing [Enter] prints the receipt in 0.1s with zero dialogs!"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowKioskGuide(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {lang === "gu" ? "સમજાઈ ગયું (Close)" : "Got It (Close)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
