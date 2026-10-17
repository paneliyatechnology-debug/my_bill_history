"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface ItemBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  itemName: string;
  salesPrice?: number;
  companyName?: string;
  lang?: "en" | "gu";
}

export function ItemBarcodeModal({
  isOpen,
  onClose,
  barcode,
  itemName,
  salesPrice,
  companyName = "MyBill History",
  lang = "en",
}: ItemBarcodeModalProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!isOpen || !barcode || !svgRef.current) return;

    try {
      JsBarcode(svgRef.current, barcode.trim(), {
        format: "CODE128",
        width: 2,
        height: 55,
        displayValue: true,
        fontSize: 14,
        font: "monospace",
        fontOptions: "bold",
        margin: 6,
        background: "#FFFFFF",
        lineColor: "#0F172A",
      });
    } catch (err) {
      console.warn("JsBarcode render notice:", err);
    }
  }, [isOpen, barcode]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = document.getElementById("barcode-printable-card");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=600,height=500");
    if (!printWindow) {
      alert("Please allow popups to print barcode stickers.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Sticker - ${itemName || barcode}</title>
          <style>
            @page {
              size: 50mm 35mm;
              margin: 0;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
            }
            .sticker {
              width: 100%;
              text-align: center;
              box-sizing: border-box;
            }
            .company {
              font-size: 11px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .name {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
            .price {
              font-size: 12px;
              font-weight: 700;
              color: #047857;
              margin-top: 1px;
            }
            svg {
              max-width: 90%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="sticker">
            <div class="company">${companyName}</div>
            ${printContent.querySelector("svg")?.outerHTML || ""}
            <div class="name">${itemName || "Product"}</div>
            ${
              salesPrice !== undefined && salesPrice !== null
                ? `<div class="price">SP: ₹${Number(salesPrice).toFixed(2)}</div>`
                : ""
            }
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {lang === "gu" ? "બારકોડ સ્ટીકર જુઓ" : "View Barcode"}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barcode Sticker Preview Card matching Video Screenshot */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-50/40">
          <div
            id="barcode-printable-card"
            className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md"
          >
            {/* Company / Business Name */}
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 max-w-full truncate px-2">
              {companyName}
            </div>

            {/* Barcode Graphic */}
            <div className="my-1 flex items-center justify-center overflow-x-auto max-w-full">
              <svg ref={svgRef} className="max-w-full h-auto" />
            </div>

            {/* Item Name */}
            <div className="mt-2 text-base font-bold text-slate-900 tracking-tight">
              {itemName || (lang === "gu" ? "ઉત્પાદન નામ" : "Item Name")}
            </div>

            {/* Sales Price */}
            {salesPrice !== undefined && salesPrice !== null && (
              <div className="mt-1 text-sm font-extrabold text-emerald-700 font-mono">
                SP: ₹{Number(salesPrice).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white border-t border-slate-100">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            Code: {barcode}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>{lang === "gu" ? "પ્રિન્ટ સ્ટીકર" : "Print Sticker"}</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              {lang === "gu" ? "બંધ કરો" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
