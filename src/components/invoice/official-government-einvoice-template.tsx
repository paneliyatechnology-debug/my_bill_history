"use client";

import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { formatInr } from "@/components/design-system/tokens";

export interface OfficialGovernmentEInvoiceProps {
  invoice: any;
  company: any;
  copyType?: "ORIGINAL" | "DUPLICATE" | "TRIPLICATE";
}

function formatAddress(addr: any): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr !== "object") return String(addr);
  const parts = [
    addr.addressLine1 || addr.line1 || addr.street,
    addr.addressLine2 || addr.line2,
    addr.city,
    addr.state,
    addr.pincode || addr.postalCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
}

function numberToWordsINR(amount: number): string {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num: number): string {
    if ((num = num.toString().length > 9 ? parseFloat(num.toString().substring(0, 9)) : num) === 0)
      return "";
    const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + "Crore " : "";
    str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + "Lakh " : "";
    str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + "Thousand " : "";
    str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + "Hundred " : "";
    str += Number(n[5]) !== 0 ? (str !== "" ? "and " : "") + (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]) : "";
    return str.trim();
  }

  const whole = Math.floor(Math.abs(amount));
  const fraction = Math.round((Math.abs(amount) - whole) * 100);

  let result = inWords(whole);
  if (!result) result = "Zero";
  result = "Rupees " + result;

  if (fraction > 0) {
    result += " and " + inWords(fraction) + " Paise";
  }
  return result + " Only";
}

export function OfficialGovernmentEInvoiceTemplate({
  invoice,
  company,
  copyType = "ORIGINAL",
}: OfficialGovernmentEInvoiceProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const eInv = invoice.eInvoiceRecord || invoice.eInvoice || null;
  const isRegistered = Boolean(eInv && eInv.irn && eInv.status === "ACT");
  const isCancelled = Boolean(eInv && eInv.status === "CNL");

  // Determine copy text
  const copyLabels = {
    ORIGINAL: "ORIGINAL FOR RECIPIENT",
    DUPLICATE: "DUPLICATE FOR TRANSPORTER",
    TRIPLICATE: "TRIPLICATE FOR SUPPLIER",
  };
  const copyText = copyLabels[copyType] || "ORIGINAL FOR RECIPIENT";

  // Calculate HSN summary groups
  const items = invoice.items || [];
  const hsnMap = new Map<
    string,
    {
      hsnCode: string;
      taxableAmount: number;
      cgstRate: number;
      cgstAmount: number;
      sgstRate: number;
      sgstAmount: number;
      igstRate: number;
      igstAmount: number;
      cessAmount: number;
      totalTax: number;
    }
  >();

  items.forEach((it: any) => {
    const hsn = it.hsnCode || it.hsn || "9999";
    const taxable = Number(it.taxableAmount || Number(it.quantity || 1) * Number(it.unitPrice || 0));
    const cgst = Number(it.cgstAmount || 0);
    const sgst = Number(it.sgstAmount || 0);
    const igst = Number(it.igstAmount || 0);
    const cess = Number(it.cessAmount || 0);
    const totalTax = cgst + sgst + igst + cess;

    const existing = hsnMap.get(hsn);
    if (existing) {
      existing.taxableAmount += taxable;
      existing.cgstAmount += cgst;
      existing.sgstAmount += sgst;
      existing.igstAmount += igst;
      existing.cessAmount += cess;
      existing.totalTax += totalTax;
    } else {
      const taxRate = Number(it.taxRate || 0);
      const isInter = igst > 0;
      hsnMap.set(hsn, {
        hsnCode: hsn,
        taxableAmount: taxable,
        cgstRate: isInter ? 0 : taxRate / 2,
        cgstAmount: cgst,
        sgstRate: isInter ? 0 : taxRate / 2,
        sgstAmount: sgst,
        igstRate: isInter ? taxRate : 0,
        igstAmount: igst,
        cessAmount: cess,
        totalTax,
      });
    }
  });

  const hsnSummaryList = Array.from(hsnMap.values());

  // Render QR Code (Official Signed QR or Placeholder)
  useEffect(() => {
    if (!qrCanvasRef.current) return;
    try {
      const qrData =
        eInv?.signedQrCode ||
        (isRegistered
          ? `IRN:${eInv.irn}|GSTIN:${company.gstin || ""}|DOC:${invoice.invoiceNumber}|DATE:${invoice.invoiceDate}`
          : `NIC_IRP_DRAFT|DOC:${invoice.invoiceNumber}|DATE:${invoice.invoiceDate}|TOTAL:${invoice.grandTotal}`);

      QRCode.toCanvas(qrCanvasRef.current, qrData, {
        width: 120,
        margin: 1,
        color: {
          dark: isCancelled ? "#991b1b" : "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });
    } catch (err) {
      console.warn("Could not render QR canvas:", err);
    }
  }, [eInv, isRegistered, isCancelled, invoice.invoiceNumber, invoice.invoiceDate, invoice.grandTotal, company.gstin]);

  const supplierName = company?.legalName || company?.name || "JK ENTERPRISE";
  const supplierTradeName = company?.tradeName;
  const supplierGstin = company?.gstin || "24AAAPL1234C1ZV";
  const supplierState = company?.state || "Gujarat";
  const supplierStateCode = company?.stateCode || (supplierGstin ? supplierGstin.slice(0, 2) : "24");
  const supplierAddress =
    formatAddress(company?.billingAddress) ||
    formatAddress({
      addressLine1: company?.addressLine1,
      city: company?.city,
      pincode: company?.pincode,
    }) ||
    "Amreli, Gujarat - 365630";
  const supplierPan = company?.pan || (supplierGstin && supplierGstin.length >= 10 ? supplierGstin.slice(2, 12) : "");

  const buyerName = invoice.party?.name || "Cash / Counter Customer";
  const buyerGstin = invoice.party?.gstin || "URP (Unregistered)";
  const buyerState = invoice.party?.state || "Gujarat";
  const buyerStateCode =
    invoice.party?.stateCode ||
    (invoice.party?.gstin && invoice.party.gstin.length >= 2 ? invoice.party.gstin.slice(0, 2) : "24");
  const buyerAddress =
    formatAddress(invoice.party?.billingAddress) ||
    formatAddress(invoice.billingAddress) ||
    formatAddress(invoice.party?.address) ||
    "Ahmedabad, Gujarat";
  const placeOfSupply = invoice.placeOfSupply || `${buyerStateCode} - ${buyerState}`;

  const taxableAmount = Number(invoice.taxableAmount || 0);
  const cgstAmount = Number(invoice.cgstAmount || 0);
  const sgstAmount = Number(invoice.sgstAmount || 0);
  const igstAmount = Number(invoice.igstAmount || 0);
  const cessAmount = Number(invoice.cessAmount || 0);
  const totalTaxAmount = cgstAmount + sgstAmount + igstAmount + cessAmount;
  const grandTotal = Number(invoice.grandTotal || 0);
  const roundOff = Number(invoice.roundOff || 0);

  const documentType =
    invoice.category === "CREDIT_NOTE"
      ? "CREDIT NOTE"
      : invoice.category === "DEBIT_NOTE"
      ? "DEBIT NOTE"
      : "TAX INVOICE";

  return (
    <div
      id="printable-official-einvoice"
      className="mx-auto w-full max-w-4xl bg-white text-slate-900 border-2 border-slate-900 font-sans text-xs shadow-xl print:shadow-none print:border-slate-900 print:text-[10px] print:w-full print:max-w-none"
    >
      {/* 1. OFFICIAL STATUTORY HEADER BANNER */}
      <div className="border-b-2 border-slate-900 p-3 bg-slate-50/60 flex items-start justify-between gap-4">
        {/* Left / Center: Document Title & Legal Authority */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="inline-block border border-slate-900 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-white">
              {copyText}
            </span>
            {isCancelled && (
              <span className="inline-block rounded bg-rose-600 px-2.5 py-0.5 text-[10px] font-semibold text-white tracking-widest uppercase">
                CANCELLED E-INVOICE
              </span>
            )}
          </div>

          <h1 className="mt-2 text-xl font-semibold tracking-wider text-slate-950 uppercase">
            {documentType}
          </h1>
          <p className="text-[10px] font-semibold text-slate-600">
            [ Issued under Rule 48(4) of the Central Goods and Services Tax Rules, 2017 ]
          </p>

          {/* IRN & Acknowledgement Details Box */}
          <div className="mt-2 rounded border border-slate-300 bg-white p-2 text-[11px] leading-tight space-y-1">
            <div className="flex items-start gap-1 font-mono">
              <span className="font-bold text-slate-700 shrink-0">IRN:</span>
              {isRegistered ? (
                <span className="font-semibold text-emerald-800 break-all select-all">
                  {eInv.irn}
                </span>
              ) : (
                <span className="font-semibold text-amber-700 italic">
                  Not Generated (Document in Draft / Preview Mode — IRN will appear upon IRP registration)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-slate-700 font-mono text-[10px]">
              <div>
                <span className="font-bold text-slate-500">Ack No: </span>
                <span className="font-bold text-slate-900">{isRegistered ? eInv.ackNo : "—"}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Ack Date: </span>
                <span className="font-bold text-slate-900">
                  {isRegistered
                    ? new Date(eInv.ackDate).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })
                    : "—"}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500">IRP Status: </span>
                <span
                  className={`font-bold ${
                    isCancelled
                      ? "text-rose-700 font-semibold"
                      : isRegistered
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {isCancelled ? "CANCELLED (CNL)" : isRegistered ? "ACTIVE (ACT)" : "DRAFT"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: NIC IRP Signed QR Code Box */}
        <div className="shrink-0 flex flex-col items-center justify-center border border-slate-900 bg-white p-1.5 text-center">
          <canvas ref={qrCanvasRef} className="h-[105px] w-[105px]" />
          <div className="mt-1 text-[8px] font-bold text-slate-700 uppercase tracking-tighter">
            {isRegistered ? "NIC IRP Signed QR" : "Official QR Preview"}
          </div>
        </div>
      </div>

      {/* 2. INVOICE META & SUPPLY IDENTIFICATION GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b-2 border-slate-900 divide-x divide-y sm:divide-y-0 divide-slate-400 bg-slate-50/40 text-[11px]">
        <div className="p-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Invoice / Doc Number</div>
          <div className="font-semibold text-slate-900 font-mono text-sm">{invoice.invoiceNumber}</div>
        </div>
        <div className="p-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Invoice Date</div>
          <div className="font-bold text-slate-900">
            {invoice.invoiceDate
              ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "—"}
          </div>
        </div>
        <div className="p-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Supply Category</div>
          <div className="font-bold text-slate-900 uppercase">
            {invoice.category === "B2B" || !invoice.category || invoice.category === "TAX_INVOICE"
              ? "B2B - Regular"
              : invoice.category}
          </div>
        </div>
        <div className="p-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Reverse Charge (RCM)</div>
          <div className="font-bold text-slate-900 uppercase">
            {invoice.reverseCharge ? "YES" : "NO"}
          </div>
        </div>
      </div>

      {/* 3. SUPPLIER (SELLER) & RECIPIENT (BUYER) STATUTORY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 divide-y sm:divide-y-0 sm:divide-x-2 divide-slate-900">
        {/* SUPPLIER DETAILS */}
        <div className="p-3 bg-white">
          <div className="border-b border-slate-300 pb-1 mb-2 font-semibold text-slate-900 uppercase text-[11px] tracking-wide flex items-center justify-between">
            <span>Details of Supplier (Seller)</span>
            <span className="text-[10px] text-slate-500 font-normal">State Code: {supplierStateCode}</span>
          </div>
          <div className="font-semibold text-slate-950 text-sm">{supplierName}</div>
          {supplierTradeName && supplierTradeName !== supplierName && (
            <div className="text-[11px] font-semibold text-slate-700">Trade: {supplierTradeName}</div>
          )}
          <div className="mt-1 text-slate-700 leading-tight">{supplierAddress}</div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-1 text-[11px]">
            <div>
              <span className="font-bold text-slate-600">GSTIN: </span>
              <span className="font-semibold text-slate-950 font-mono">{supplierGstin}</span>
            </div>
            <div>
              <span className="font-bold text-slate-600">State: </span>
              <span className="font-bold text-slate-900">
                {supplierState} ({supplierStateCode})
              </span>
            </div>
            {supplierPan && (
              <div>
                <span className="font-bold text-slate-600">PAN: </span>
                <span className="font-bold text-slate-900 font-mono">{supplierPan}</span>
              </div>
            )}
            {company?.phone && (
              <div>
                <span className="font-bold text-slate-600">Phone: </span>
                <span className="text-slate-900">{company.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* RECIPIENT (BUYER) DETAILS */}
        <div className="p-3 bg-white">
          <div className="border-b border-slate-300 pb-1 mb-2 font-semibold text-slate-900 uppercase text-[11px] tracking-wide flex items-center justify-between">
            <span>Details of Recipient / Buyer (Billed To)</span>
            <span className="text-[10px] text-slate-500 font-normal">State Code: {buyerStateCode}</span>
          </div>
          <div className="font-semibold text-slate-950 text-sm">{buyerName}</div>
          <div className="mt-1 text-slate-700 leading-tight">{buyerAddress}</div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-1 text-[11px]">
            <div>
              <span className="font-bold text-slate-600">GSTIN/UIN: </span>
              <span className="font-semibold text-slate-950 font-mono">{buyerGstin}</span>
            </div>
            <div>
              <span className="font-bold text-slate-600">State: </span>
              <span className="font-bold text-slate-900">
                {buyerState} ({buyerStateCode})
              </span>
            </div>
            <div className="col-span-2">
              <span className="font-bold text-slate-600">Place of Supply (POS): </span>
              <span className="font-semibold text-slate-950">{placeOfSupply}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. OFFICIAL STATUTORY ITEM DETAILS TABLE */}
      <div className="overflow-x-auto border-b-2 border-slate-900">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
              <th className="py-2 px-1.5 text-center border-r border-slate-700 w-8">#</th>
              <th className="py-2 px-2 border-r border-slate-700">Description of Goods / Services</th>
              <th className="py-2 px-1.5 text-center border-r border-slate-700 w-16">HSN/SAC</th>
              <th className="py-2 px-1.5 text-right border-r border-slate-700 w-12">Qty</th>
              <th className="py-2 px-1.5 text-center border-r border-slate-700 w-12">Unit</th>
              <th className="py-2 px-2 text-right border-r border-slate-700 w-20">Rate (₹)</th>
              <th className="py-2 px-2 text-right border-r border-slate-700 w-22">Taxable (₹)</th>
              <th className="py-2 px-2 text-right border-r border-slate-700 w-20">CGST (₹)</th>
              <th className="py-2 px-2 text-right border-r border-slate-700 w-20">SGST (₹)</th>
              {igstAmount > 0 && <th className="py-2 px-2 text-right border-r border-slate-700 w-20">IGST (₹)</th>}
              <th className="py-2 px-2 text-right w-24">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 text-[11px]">
            {items.map((it: any, idx: number) => {
              const qty = Number(it.quantity || 1);
              const rate = Number(it.unitPrice || 0);
              const taxable = Number(it.taxableAmount || qty * rate);
              const cgst = Number(it.cgstAmount || 0);
              const sgst = Number(it.sgstAmount || 0);
              const igst = Number(it.igstAmount || 0);
              const total = Number(it.totalAmount || taxable + cgst + sgst + igst);
              const unit = it.unit || it.uqc || "PCS";
              const hsn = it.hsnCode || it.hsn || "—";

              return (
                <tr key={it.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-2 px-1.5 text-center font-bold text-slate-500 border-r border-slate-300">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300">
                    <div className="font-bold text-slate-900">{it.description || it.name || "Item"}</div>
                  </td>
                  <td className="py-2 px-1.5 text-center font-mono font-semibold text-slate-700 border-r border-slate-300">
                    {hsn}
                  </td>
                  <td className="py-2 px-1.5 text-right font-bold text-slate-800 border-r border-slate-300">
                    {qty}
                  </td>
                  <td className="py-2 px-1.5 text-center font-semibold text-slate-600 border-r border-slate-300 uppercase">
                    {unit}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-800 border-r border-slate-300">
                    {formatInr(rate)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 border-r border-slate-300">
                    {formatInr(taxable)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-700 border-r border-slate-300">
                    {cgst > 0 ? (
                      <div>
                        <div>{formatInr(cgst)}</div>
                        <div className="text-[9px] text-slate-500">@{((it.taxRate || 0) / 2).toFixed(1)}%</div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-700 border-r border-slate-300">
                    {sgst > 0 ? (
                      <div>
                        <div>{formatInr(sgst)}</div>
                        <div className="text-[9px] text-slate-500">@{((it.taxRate || 0) / 2).toFixed(1)}%</div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  {igstAmount > 0 && (
                    <td className="py-2 px-2 text-right font-mono text-slate-700 border-r border-slate-300">
                      {igst > 0 ? (
                        <div>
                          <div>{formatInr(igst)}</div>
                          <div className="text-[9px] text-slate-500">@{(it.taxRate || 0).toFixed(1)}%</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="py-2 px-2 text-right font-mono font-semibold text-slate-950">
                    {formatInr(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* TOTALS FOOTER ROW */}
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-[11px]">
              <td colSpan={3} className="py-2 px-2 text-right uppercase border-r border-slate-300">
                Total Item Values:
              </td>
              <td className="py-2 px-1.5 text-right font-semibold border-r border-slate-300">
                {items.reduce((s: number, i: any) => s + Number(i.quantity || 1), 0)}
              </td>
              <td className="border-r border-slate-300"></td>
              <td className="border-r border-slate-300"></td>
              <td className="py-2 px-2 text-right font-mono font-semibold border-r border-slate-300">
                {formatInr(taxableAmount)}
              </td>
              <td className="py-2 px-2 text-right font-mono font-semibold border-r border-slate-300">
                {cgstAmount > 0 ? formatInr(cgstAmount) : "—"}
              </td>
              <td className="py-2 px-2 text-right font-mono font-semibold border-r border-slate-300">
                {sgstAmount > 0 ? formatInr(sgstAmount) : "—"}
              </td>
              {igstAmount > 0 && (
                <td className="py-2 px-2 text-right font-mono font-semibold border-r border-slate-300">
                  {formatInr(igstAmount)}
                </td>
              )}
              <td className="py-2 px-2 text-right font-mono font-semibold text-slate-950">
                {formatInr(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 5. HSN/SAC TAX SUMMARY BREAKUP (RULE 48 MANDATORY GRID) */}
      <div className="border-b-2 border-slate-900 p-2 bg-slate-50/50">
        <div className="text-[10px] font-semibold uppercase text-slate-700 mb-1 tracking-wider">
          HSN / SAC Wise Statutory Tax Summary
        </div>
        <table className="w-full text-left border border-slate-400 border-collapse bg-white text-[10px]">
          <thead>
            <tr className="bg-slate-200 font-bold text-slate-800 border-b border-slate-400">
              <th className="p-1 border-r border-slate-300">HSN/SAC</th>
              <th className="p-1 text-right border-r border-slate-300">Taxable Value (₹)</th>
              <th className="p-1 text-center border-r border-slate-300">CGST Rate</th>
              <th className="p-1 text-right border-r border-slate-300">CGST (₹)</th>
              <th className="p-1 text-center border-r border-slate-300">SGST Rate</th>
              <th className="p-1 text-right border-r border-slate-300">SGST (₹)</th>
              <th className="p-1 text-center border-r border-slate-300">IGST Rate</th>
              <th className="p-1 text-right border-r border-slate-300">IGST (₹)</th>
              <th className="p-1 text-right">Total Tax (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-mono">
            {hsnSummaryList.map((row) => (
              <tr key={row.hsnCode}>
                <td className="p-1 font-bold text-slate-900 border-r border-slate-300">{row.hsnCode}</td>
                <td className="p-1 text-right border-r border-slate-300">{formatInr(row.taxableAmount)}</td>
                <td className="p-1 text-center border-r border-slate-300">{row.cgstRate > 0 ? `${row.cgstRate}%` : "0%"}</td>
                <td className="p-1 text-right border-r border-slate-300">{formatInr(row.cgstAmount)}</td>
                <td className="p-1 text-center border-r border-slate-300">{row.sgstRate > 0 ? `${row.sgstRate}%` : "0%"}</td>
                <td className="p-1 text-right border-r border-slate-300">{formatInr(row.sgstAmount)}</td>
                <td className="p-1 text-center border-r border-slate-300">{row.igstRate > 0 ? `${row.igstRate}%` : "0%"}</td>
                <td className="p-1 text-right border-r border-slate-300">{formatInr(row.igstAmount)}</td>
                <td className="p-1 text-right font-bold text-slate-900">{formatInr(row.totalTax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t border-slate-400">
              <td className="p-1 uppercase border-r border-slate-300">Total</td>
              <td className="p-1 text-right font-mono border-r border-slate-300">{formatInr(taxableAmount)}</td>
              <td className="p-1 border-r border-slate-300"></td>
              <td className="p-1 text-right font-mono border-r border-slate-300">{formatInr(cgstAmount)}</td>
              <td className="p-1 border-r border-slate-300"></td>
              <td className="p-1 text-right font-mono border-r border-slate-300">{formatInr(sgstAmount)}</td>
              <td className="p-1 border-r border-slate-300"></td>
              <td className="p-1 text-right font-mono border-r border-slate-300">{formatInr(igstAmount)}</td>
              <td className="p-1 text-right font-mono font-semibold text-slate-900">{formatInr(totalTaxAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 6. TOTALS & WORDS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 divide-y sm:divide-y-0 sm:divide-x-2 divide-slate-900">
        {/* Left: Words & Bank Account Details */}
        <div className="p-3 bg-white space-y-2">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Invoice Value (in words):</div>
            <div className="font-bold text-slate-950 text-[11px] leading-tight">
              {numberToWordsINR(grandTotal)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Tax Amount (in words):</div>
            <div className="font-semibold text-slate-800 text-[11px] leading-tight">
              {numberToWordsINR(totalTaxAmount)}
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] space-y-0.5">
            <div className="font-bold text-slate-800 uppercase tracking-tight">Bank Details for RTGS / NEFT:</div>
            <div>
              <span className="font-semibold text-slate-500">Bank Name: </span>
              <span className="font-bold text-slate-900">State Bank of India</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">A/C Number: </span>
              <span className="font-mono font-bold text-slate-900">638880001122</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">IFSC Code: </span>
              <span className="font-mono font-bold text-slate-900">SBIN0001234</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Branch: </span>
              <span className="font-bold text-slate-900">Amreli Branch</span>
            </div>
          </div>
        </div>

        {/* Right: Totals Calculation Summary */}
        <div className="p-3 bg-slate-50/50 space-y-1 text-[11px]">
          <div className="flex justify-between py-0.5 border-b border-slate-200">
            <span className="text-slate-600">Total Taxable Value:</span>
            <span className="font-mono font-semibold text-slate-900">{formatInr(taxableAmount)}</span>
          </div>
          {cgstAmount > 0 && (
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-600">Central Tax (CGST):</span>
              <span className="font-mono font-semibold text-slate-900">{formatInr(cgstAmount)}</span>
            </div>
          )}
          {sgstAmount > 0 && (
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-600">State Tax (SGST):</span>
              <span className="font-mono font-semibold text-slate-900">{formatInr(sgstAmount)}</span>
            </div>
          )}
          {igstAmount > 0 && (
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-600">Integrated Tax (IGST):</span>
              <span className="font-mono font-semibold text-slate-900">{formatInr(igstAmount)}</span>
            </div>
          )}
          {cessAmount > 0 && (
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-600">Total Cess:</span>
              <span className="font-mono font-semibold text-slate-900">{formatInr(cessAmount)}</span>
            </div>
          )}
          {roundOff !== 0 && (
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-600">Round Off:</span>
              <span className="font-mono font-semibold text-slate-900">{formatInr(roundOff)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 text-sm font-semibold border-t-2 border-slate-900 bg-white p-2 rounded">
            <span className="text-slate-950 uppercase">Grand Total:</span>
            <span className="font-mono text-emerald-800 font-semibold">{formatInr(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* 7. TERMS, DECLARATION & SIGNATORY BLOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-2 divide-slate-900 p-3 bg-white text-[10px]">
        {/* Declarations and Legal Terms */}
        <div className="pr-2 space-y-1.5">
          <div className="font-bold text-slate-800 uppercase tracking-tight">Terms & Conditions:</div>
          <ol className="list-decimal list-inside text-slate-600 space-y-0.5 text-[9px] leading-tight">
            <li>Goods once sold will not be accepted back or exchanged.</li>
            <li>Interest @ 18% p.a. will be charged if payment is delayed beyond the due date.</li>
            <li>All disputes are subject to local jurisdiction only.</li>
          </ol>
          <div className="mt-2 text-[9px] text-slate-500 italic leading-snug">
            <b>Declaration:</b> We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct. This is a computer generated statutory E-Invoice under Rule 48(4) of the CGST Rules, 2017.
          </div>
        </div>

        {/* Authorized Signatory */}
        <div className="pl-2 pt-2 sm:pt-0 flex flex-col justify-between items-end text-right">
          <div>
            <div className="font-bold text-slate-800 text-[11px]">For {supplierName}</div>
            <div className="text-[9px] text-slate-500">Authorized Signatory / Digitally Signed</div>
          </div>

          <div className="mt-10 border-t border-slate-400 pt-1 w-48 text-center text-[10px] font-bold text-slate-900">
            Authorised Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

