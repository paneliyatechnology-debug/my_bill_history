"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

// ─────────────────────────────────────────────────────────────
// Real Scannable Invoice QR Code Component
// ─────────────────────────────────────────────────────────────
interface InvoiceQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
  showTooltip?: boolean;
  onClick?: () => void;
}

export function InvoiceQrCode({
  value,
  size = 96,
  className = "",
  label,
  showTooltip = true,
  onClick,
}: InvoiceQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;

    let isMounted = true;
    QRCode.toDataURL(value, {
      width: Math.max(size * 2, 256),
      margin: 1,
      color: {
        dark: "#0F172A", // Slate 900 for high optical contrast
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to generate QR code:", err);
          setError("QR Error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  return (
    <div
      onClick={onClick}
      className={`relative group inline-flex flex-col items-center justify-center bg-white border border-slate-300 p-1 rounded-lg shadow-xs transition-all ${
        onClick ? "cursor-pointer hover:border-primary hover:shadow-md active:scale-95" : ""
      } ${className}`}
      style={{ width: size, minWidth: size, height: size }}
      title={showTooltip ? "Scan with phone camera to open invoice (સ્કેન કરીને બિલ જુઓ)" : undefined}
    >
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt="Scannable Invoice QR Code"
          className="w-full h-full object-contain rounded"
        />
      ) : error ? (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-rose-500 font-mono">
          {error}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 animate-pulse rounded">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {label && (
        <span className="text-[9px] font-bold text-slate-500 tracking-tight mt-0.5 print:text-black">
          {label}
        </span>
      )}

      {showTooltip && onClick && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-10 print:hidden">
          Click for Barcode Sticker
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Real Scannable Invoice Barcode (Code128) Component
// ─────────────────────────────────────────────────────────────
interface InvoiceBarcodeProps {
  value: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export function InvoiceBarcode({
  value,
  height = 36,
  width = 1.4,
  displayValue = true,
  fontSize = 11,
  className = "",
}: InvoiceBarcodeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width,
        height,
        displayValue,
        fontSize,
        font: "monospace",
        fontOptions: "bold",
        margin: 4,
        background: "#FFFFFF",
        lineColor: "#0F172A",
      });
    } catch (err) {
      console.warn("JsBarcode generation note:", err);
    }
  }, [value, height, width, displayValue, fontSize]);

  return (
    <div className={`inline-flex flex-col items-center bg-white rounded border border-slate-200 p-1 shadow-xs ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Printable Barcode & QR Sticker Modal (બારકોડ સ્ટીકર)
// ─────────────────────────────────────────────────────────────
interface InvoiceBarcodeStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    vendorInvoiceNumber: string;
    invoiceDate: string;
    grandTotal: number | string;
    party?: {
      name?: string;
      gstin?: string;
      phone?: string;
    };
  };
  company?: {
    tradeName?: string;
    legalName?: string;
    gstin?: string;
  } | null;
  lang?: string;
}

export function InvoiceBarcodeStickerModal({
  isOpen,
  onClose,
  invoice,
  company,
  lang = "gu",
}: InvoiceBarcodeStickerModalProps) {
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [stickerFormat, setStickerFormat] = useState<"standard" | "compact" | "thermal">("standard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!isOpen || !invoice) return null;

  const invoiceUrl = origin ? `${origin}/purchases/${invoice.id}` : `/purchases/${invoice.id}`;
  const companyName = company?.tradeName || company?.legalName || "MyBill";
  const formattedDate = new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTotal = Number(invoice.grandTotal || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(invoiceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrintSticker = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#174B43] flex items-center justify-center text-lg font-bold shadow-xs">
              🏷️
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {lang === "gu" ? "બારકોડ અને સ્કેનર સ્ટીકર (Barcode Sticker)" : "Barcode & QR Scanner Sticker"}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "gu"
                  ? "સ્કેન કરતાં જ આ ખરીદી બિલ સીધું ઓપન થશે"
                  : "Scan this sticker with any camera to open this invoice"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Format Selector */}
          <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setStickerFormat("standard")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                stickerFormat === "standard"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Standard (80×50mm)
            </button>
            <button
              onClick={() => setStickerFormat("compact")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                stickerFormat === "compact"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Compact (50×30mm)
            </button>
            <button
              onClick={() => setStickerFormat("thermal")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                stickerFormat === "thermal"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Thermal Roll
            </button>
          </div>

          {/* THE REAL SCANNABLE STICKER PREVIEW (Printable Area) */}
          <div
            id="printable-barcode-sticker"
            className="mx-auto bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 sm:p-5 shadow-sm space-y-3.5 print:border-solid print:border-black print:m-0 print:p-2"
            style={{ maxWidth: stickerFormat === "compact" ? "320px" : "420px" }}
          >
            {/* Header: Company & Bill tag */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
                  {companyName}
                </h4>
                {company?.gstin && (
                  <p className="text-[10px] font-mono text-slate-500">GSTIN: {company.gstin}</p>
                )}
              </div>
              <span className="px-2 py-0.5 bg-orange-50 text-[#174B43] border border-orange-200 text-[10px] font-bold rounded uppercase">
                PURCHASE INVOICE
              </span>
            </div>

            {/* Middle: Real QR Code + Invoice Details */}
            <div className="flex items-center gap-3.5">
              {/* Real High-Contrast QR Code */}
              <div className="shrink-0 flex flex-col items-center">
                <InvoiceQrCode
                  value={invoiceUrl}
                  size={stickerFormat === "compact" ? 76 : 96}
                  showTooltip={false}
                  label="SCAN FOR INVOICE"
                />
              </div>

              {/* Invoice Metadata */}
              <div className="flex-1 min-w-0 space-y-1 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">INVOICE NUMBER</span>
                  <p className="font-mono font-bold text-slate-900 truncate">
                    {invoice.vendorInvoiceNumber}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">SUPPLIER</span>
                  <p className="font-bold text-slate-800 truncate">
                    {invoice.party?.name || "Vendor"}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">DATE</span>
                    <strong className="font-mono text-slate-700 text-[11px]">{formattedDate}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">TOTAL</span>
                    <strong className="font-bold text-[#174B43] text-xs">{formattedTotal}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Real Code128 Barcode */}
            <div className="pt-2 border-t border-slate-200 flex flex-col items-center justify-center">
              <InvoiceBarcode
                value={invoice.vendorInvoiceNumber}
                height={stickerFormat === "compact" ? 28 : 36}
                width={stickerFormat === "compact" ? 1.2 : 1.4}
                fontSize={10}
              />
              <span className="text-[9px] text-slate-400 tracking-wider font-mono mt-0.5">
                VERIFIED BILL RECORD • {invoice.id.substring(0, 8)}
              </span>
            </div>
          </div>

          {/* Direct Link Information */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Direct Scan URL
              </span>
              <p className="font-mono text-slate-700 text-[11px] truncate">{invoiceUrl}</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="shrink-0 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
            >
              {copied ? "✓ Copied" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            {lang === "gu" ? "બંધ કરો" : "Close"}
          </button>

          <button
            onClick={handlePrintSticker}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>🖨️</span>
            <span>{lang === "gu" ? "સ્ટીકર પ્રિન્ટ કરો" : "Print Sticker"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
