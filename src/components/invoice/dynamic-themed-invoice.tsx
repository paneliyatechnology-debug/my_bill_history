"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { InvoiceStudioState } from "@/components/invoice/invoice-settings-studio";
import {
  FestiveBackgroundSvg,
  FESTIVE_SKINS,
  resolvePreviewLayout,
} from "@/components/invoice/invoice-live-preview";
import { resolveThemeDefinition } from "@/lib/invoice-theme-keys";

export interface DynamicInvoiceParty {
  id?: string;
  name?: string;
  tradeName?: string;
  gstin?: string;
  stateCode?: string;
  phone?: string;
  email?: string;
  billingAddress?: any;
  shippingAddress?: any;
  currentBalance?: number;
}

export interface DynamicInvoiceItem {
  id?: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRate?: number;
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
  unit?: string;
  batchNo?: string;
  expDate?: string;
  mfgDate?: string;
  item?: { name?: string; nameGujarati?: string; sku?: string };
}

export interface DynamicInvoiceData {
  id?: string;
  category?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status?: string;
  paymentMode?: string;
  placeOfSupply?: string;
  isB2B?: boolean;
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  roundOff?: number;
  grandTotal: number;
  paidAmount?: number;
  balanceAmount?: number;
  outstandingBalance?: number;
  notes?: string;
  party?: DynamicInvoiceParty;
  items: DynamicInvoiceItem[];
  eWayBillRecord?: any;
  bankAccount?: any;
}

export interface DynamicCompanyData {
  id?: string;
  legalName?: string;
  tradeName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  pincode?: string;
  stateCode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  upiVpa?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  accountHolderName?: string;
}

function numberToWordsINR(amount: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num: number): string {
    if ((num = num.toString().length > 9 ? parseFloat(num.toString().substring(0, 9)) : num) === 0) return "";
    const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + "Crore " : "";
    str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + "Lakh " : "";
    str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + "Thousand " : "";
    str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + "Hundred " : "";
    str += Number(n[5]) !== 0 ? ((str !== "") ? "and " : "") + (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]) : "";
    return str.trim();
  }

  const whole = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - whole) * 100);
  let res = whole === 0 ? "Zero Rupees" : inWords(whole) + " Rupees";
  if (paise > 0) {
    res += " and " + inWords(paise) + " Paise";
  }
  return res + " Only";
}

function formatAddress(addr: any): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  const parts = [
    addr.addressLine1 || addr.line1 || addr.street,
    addr.addressLine2 || addr.line2,
    addr.city,
    addr.state,
    addr.pincode || addr.postalCode,
  ].filter(Boolean);
  return parts.join(", ");
}

export function getPaperSizeDimensions(size: string = "A4") {
  switch (size?.toUpperCase()) {
    case "A5":
      return {
        className: "max-w-[559px] min-h-[794px]",
        name: "A5 (Half Page: 148 × 210 mm)",
        aspectRatio: "148 / 210",
      };
    case "US_LETTER":
    case "LETTER":
      return {
        className: "max-w-[816px] min-h-[1056px]",
        name: "US Letter (216 × 279 mm)",
        aspectRatio: "216 / 279",
      };
    case "LEGAL":
      return {
        className: "max-w-[816px] min-h-[1345px]",
        name: "Legal (216 × 356 mm)",
        aspectRatio: "216 / 356",
      };
    case "THERMAL_80":
    case "THERMAL":
      return {
        className: "max-w-[320px] min-h-[500px]",
        name: "Thermal POS (80 mm)",
        aspectRatio: "auto",
      };
    case "DL":
      return {
        className: "max-w-[374px] min-h-[794px]",
        name: "DL Envelope (99 × 210 mm)",
        aspectRatio: "99 / 210",
      };
    case "A4":
    default:
      return {
        className: "max-w-[794px] min-h-[1123px]",
        name: "A4 Size (210 × 297 mm)",
        aspectRatio: "210 / 297",
      };
  }
}

export function DynamicThemedInvoice({
  invoice,
  settings,
  company,
  printableId = "printable-invoice",
}: {
  invoice: DynamicInvoiceData;
  settings: InvoiceStudioState;
  company?: DynamicCompanyData | null;
  printableId?: string;
}) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const upiQrRef = useRef<HTMLCanvasElement | null>(null);

  const companyName =
    company?.tradeName ||
    company?.legalName ||
    "JK Enterprise";
  const companyAddress = [
    company?.addressLine1,
    company?.addressLine2,
    company?.city,
    company?.pincode ? `- ${company.pincode}` : "",
  ]
    .filter(Boolean)
    .join(", ") || "Amreli, Gujarat, 365630";
  const companyPhone = company?.phone || "9898990001";
  const companyGstin = company?.gstin || "24AAAPL1234C1ZV";
  const companyPan = company?.pan || "";
  const companyStateCode = company?.stateCode || "24";

  const partyName = invoice.party?.name || invoice.party?.tradeName || "Cash Customer / Walk-in";
  const partyAddress = formatAddress(invoice.party?.billingAddress) || "Local Customer";
  const shippingAddress =
    formatAddress(invoice.party?.shippingAddress) || partyAddress;
  const partyGstin = invoice.party?.gstin || "";
  const partyPhone = invoice.party?.phone || "";
  const partyBalance =
    invoice.party?.currentBalance !== undefined ? invoice.party.currentBalance : 0;

  const docCategory = invoice.category || "TAX_INVOICE";
  const docTitle =
    docCategory === "PROFORMA_INVOICE"
      ? "QUOTATION"
      : docCategory === "DELIVERY_CHALLAN"
      ? "DELIVERY CHALLAN"
      : "TAX INVOICE";

  const resolvedDef = resolveThemeDefinition(
    settings.uniqueThemeKey || settings.festiveTheme || settings.themeId,
    settings.festiveVariant
  );
  const layout = resolvedDef.isFestive ? "festival" : resolvedDef.uniqueKey;
  const activeColor = settings.accentColor || "#111111";
  const skin = resolvedDef.isFestive ? FESTIVE_SKINS[resolvedDef.baseTheme] || FESTIVE_SKINS.navratri : null;

  const bankAccountVal =
    company?.accountNumber || "639898001122";
  const bankHolderName =
    company?.accountHolderName || companyName;
  const bankIfsc = company?.ifscCode || "SBIN0001234";
  const bankName = company?.bankName || "State Bank of India";
  const bankBranch = company?.branchName || "Main Branch";
  const upiVpa = company?.upiVpa || "9898990001@paytm";

  // Generate Barcode
  useEffect(() => {
    if (barcodeRef.current && bankAccountVal) {
      try {
        JsBarcode(barcodeRef.current, bankAccountVal, {
          format: "CODE128",
          width: 1.3,
          height: 32,
          displayValue: true,
          fontSize: 10,
          margin: 1,
        });
      } catch {}
    }
  }, [bankAccountVal]);

  // Generate UPI QR Code
  useEffect(() => {
    if (upiQrRef.current && upiVpa) {
      try {
        const bal = invoice.balanceAmount !== undefined ? invoice.balanceAmount : invoice.grandTotal;
        const upiUrl = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(companyName)}&am=${bal}&cu=INR&tn=Invoice%20${encodeURIComponent(invoice.invoiceNumber)}`;
        QRCode.toCanvas(upiQrRef.current, upiUrl, {
          width: 72,
          margin: 1,
        });
      } catch {}
    }
  }, [upiVpa, companyName, invoice.balanceAmount, invoice.grandTotal, invoice.invoiceNumber]);

  // HSN Tax Breakdown Map
  const hsnMap: Record<
    string,
    { hsn: string; taxable: number; rate: number; cgst: number; sgst: number; igst: number; total: number }
  > = {};

  (invoice.items || []).forEach((it) => {
    const hsn = it.hsnCode || "GENERAL";
    const rate = it.taxRate || 0;
    const taxable = Number(it.taxableAmount || 0);
    const cgst = Number(it.cgstAmount || 0);
    const sgst = Number(it.sgstAmount || 0);
    const igst = Number(it.igstAmount || 0);
    const taxTotal = cgst + sgst + igst;

    if (!hsnMap[hsn]) {
      hsnMap[hsn] = { hsn, taxable: 0, rate, cgst: 0, sgst: 0, igst: 0, total: 0 };
    }
    hsnMap[hsn].taxable += taxable;
    hsnMap[hsn].cgst += cgst;
    hsnMap[hsn].sgst += sgst;
    hsnMap[hsn].igst += igst;
    hsnMap[hsn].total += taxTotal;
  });

  const hsnList = Object.values(hsnMap);
  const isInterState = Number(invoice.igstAmount || 0) > 0;

  // --------------------------------------------------------------------------
  // FESTIVE THEME LAYOUT (Authentic festive letterhead inside card)
  // --------------------------------------------------------------------------
  if (layout === "festival" && skin) {
    const dim = getPaperSizeDimensions(settings.paperSize || "A4");
    return (
      <div
        id={printableId}
        className={`relative w-full ${dim.className} mx-auto p-5 sm:p-8 text-[11px] bg-white rounded-sm shadow-md border border-slate-300 overflow-hidden flex flex-col justify-between transition-all printable-invoice print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-w-0 print:rounded-none print:min-h-screen`}
        style={{ fontFamily: settings.fontFamily || "Inter, sans-serif" }}
      >
        {/* Contained Festive Background Artwork - soft watermark without jarring white boxes */}
        <FestiveBackgroundSvg
          skinId={resolvedDef.uniqueKey}
          variant={resolvedDef.variant}
          customImageUrl={resolvedDef.bgImageSrc}
        />

        <div className="relative z-10 flex flex-col justify-between flex-1 h-full">
          {/* Top Header Row & Boxed Invoice */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="font-extrabold text-[13px] tracking-wide"
                    style={{ color: activeColor !== "#111111" ? activeColor : skin.ink }}
                  >
                    {docTitle}
                  </span>
                  <span className="rounded-[2px] border border-slate-500 bg-white/90 px-2 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                    ORIGINAL FOR RECIPIENT
                  </span>
                  {invoice.status && (
                    <span
                      className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        invoice.status === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : invoice.status === "PARTIALLY_PAID"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-bold text-amber-950/80 tracking-wide">
                  {skin.subGreeting}
                </div>
              </div>
            </div>

            {/* Outer Boxed Table Container matching myBillBook - Fully Transparent so artwork flows through seamlessly without any white patch */}
            <div className="mt-2 border border-black bg-transparent rounded-[1px] overflow-hidden flex flex-col justify-between flex-1">
              {/* Company Details & Invoice Metadata Row */}
              <div className="grid grid-cols-12 border-b border-black bg-transparent">
                <div className="col-span-7 p-3 border-r border-black">
                  <div className="text-[18px] font-black tracking-tight text-slate-950">
                    {companyName}
                  </div>
                  <div className="text-[11px] text-slate-800 leading-tight mt-1 font-medium">
                    {companyAddress}
                  </div>
                  {settings.showPhoneNumber && companyPhone && (
                    <div className="text-[11px] text-slate-800 leading-tight mt-0.5 font-medium">
                      Mobile: {companyPhone}
                    </div>
                  )}
                  {companyGstin && (
                    <div className="text-[10px] text-slate-800 font-mono mt-0.5 font-bold">
                      GSTIN: <strong>{companyGstin}</strong>
                    </div>
                  )}
                  {companyPan && (
                    <div className="text-[10px] text-slate-800 font-mono font-medium">
                      PAN: <strong>{companyPan}</strong>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-800 font-mono">
                    State: Gujarat (Code: {companyStateCode})
                  </div>
                </div>

                <div className="col-span-5 p-3 flex flex-col justify-between text-[11px] text-slate-900 bg-transparent">
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-800">Invoice No.:</span>
                    <span className="font-bold text-slate-950 font-mono">
                      #{invoice.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-800">Invoice Date:</span>
                    <span className="font-bold text-slate-950">
                      {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
                      {settings.showTimeOnInvoice && (
                        <span className="text-[10px] font-normal text-slate-600">
                          {" "}
                          {new Date(invoice.invoiceDate).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </span>
                  </div>
                  {invoice.dueDate && (
                    <div className="flex justify-between py-0.5">
                      <span className="font-semibold text-slate-800">Due Date:</span>
                      <span className="font-bold text-slate-950">
                        {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  )}
                  {invoice.placeOfSupply && (
                    <div className="flex justify-between py-0.5">
                      <span className="font-semibold text-slate-800">Place of Supply:</span>
                      <span className="font-bold text-slate-950">
                        {invoice.placeOfSupply}
                      </span>
                    </div>
                  )}
                  {settings.showPoNumber && invoice.eWayBillRecord?.poNumber && (
                    <div className="flex justify-between py-0.5">
                      <span className="font-semibold text-slate-800">PO Number:</span>
                      <span className="font-bold text-slate-950 font-mono">
                        {invoice.eWayBillRecord.poNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* BILL TO & SHIP TO Boxed Row */}
              <div className="grid grid-cols-12 border-b border-black text-[11px] bg-transparent">
                <div className="col-span-7 p-3 border-r border-black">
                  <div className="font-extrabold uppercase tracking-wider text-[10px] text-slate-700">
                    DETAILS OF RECEIVER (BILLED TO)
                  </div>
                  <div className="font-bold text-[13px] text-slate-950 mt-0.5">
                    {partyName}
                  </div>
                  <div className="text-slate-800 leading-tight mt-0.5 font-medium">
                    {partyAddress}
                  </div>
                  {settings.showPhoneNumber && partyPhone && (
                    <div className="text-slate-800 mt-0.5 font-medium">
                      Mobile: {partyPhone}
                    </div>
                  )}
                  {partyGstin && (
                    <div className="font-mono text-[10px] text-slate-800 mt-0.5 font-bold">
                      GSTIN: {partyGstin}
                    </div>
                  )}
                  {invoice.party?.stateCode && (
                    <div className="text-[10px] text-slate-700 font-mono">
                      State Code: {invoice.party.stateCode}
                    </div>
                  )}
                  {settings.showPartyBalance && partyBalance > 0 && (
                    <div className="text-rose-600 font-bold mt-1">
                      Current Balance: ₹ {partyBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>

                <div className="col-span-5 p-3 text-[11px] bg-transparent">
                  <div className="font-extrabold uppercase tracking-wider text-[10px] text-slate-700">
                    SHIP TO / DELIVERY
                  </div>
                  <div className="text-slate-800 mt-1 leading-snug font-medium">
                    {settings.showShippingAddress ? shippingAddress : partyAddress}
                  </div>
                  {invoice.paymentMode && (
                    <div className="mt-2 text-[10px] text-slate-700">
                      Payment Mode: <strong className="text-slate-900">{invoice.paymentMode}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* ITEMS Table - Full Grid Rules Matching myBillBook */}
              <div className="w-full overflow-hidden bg-transparent flex-1">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr
                      className="border-b border-black font-black text-[10.5px]"
                      style={{
                        backgroundColor: activeColor !== "#111111" ? `${activeColor}15` : "#fef3c740",
                        color: activeColor !== "#111111" ? activeColor : "#78350f",
                      }}
                    >
                      <th className="py-2 px-2.5 border-r border-black w-10 text-center">
                        S.NO.
                      </th>
                      <th className="py-2 px-2.5 border-r border-black">
                        ITEMS
                      </th>
                      {settings.showHsn && (
                        <th className="py-2 px-2 border-r border-black text-center w-16">
                          HSN
                        </th>
                      )}
                      {settings.showQuantity && (
                        <th className="py-2 px-2 border-r border-black text-center w-16">
                          QTY
                        </th>
                      )}
                      {settings.showBatchNo && (
                        <th className="py-2 px-2 border-r border-black text-center w-16">
                          BATCH
                        </th>
                      )}
                      {settings.showPricePerItem && (
                        <th className="py-2 px-2 border-r border-black text-right w-20">
                          RATE
                        </th>
                      )}
                      {settings.showDiscount && (
                        <th className="py-2 px-2 border-r border-black text-right w-14">
                          DISC
                        </th>
                      )}
                      {settings.showTax && (
                        <th className="py-2 px-2 border-r border-black text-right w-16">
                          TAX
                        </th>
                      )}
                      <th className="py-2 px-2.5 text-right w-24">
                        AMOUNT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/30 bg-transparent">
                    {(invoice.items || []).map((item, idx) => {
                      const itemName = item.item?.name || item.description || `Item #${idx + 1}`;
                      const itemDesc = item.description && item.description !== itemName ? item.description : "";
                      return (
                        <tr key={item.id || idx} className="hover:bg-amber-500/10">
                          <td className="py-2 px-2.5 border-r border-black text-center font-bold text-slate-800">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 border-r border-black">
                            <div className="font-bold text-slate-950">{itemName}</div>
                            {settings.showItemDescription && itemDesc && (
                              <div className="text-[10px] text-slate-600 mt-0.5">
                                {itemDesc}
                              </div>
                            )}
                          </td>
                          {settings.showHsn && (
                            <td className="py-2 px-2 border-r border-black text-center font-mono text-[10px] text-slate-800 font-semibold">
                              {item.hsnCode || "-"}
                            </td>
                          )}
                          {settings.showQuantity && (
                            <td className="py-2 px-2 border-r border-black text-center font-mono font-bold text-slate-950">
                              {item.quantity} {item.unit || "PCS"}
                            </td>
                          )}
                          {settings.showBatchNo && (
                            <td className="py-2 px-2 border-r border-black text-center font-mono text-[10px] text-slate-700">
                              {item.batchNo || "-"}
                            </td>
                          )}
                          {settings.showPricePerItem && (
                            <td className="py-2 px-2 border-r border-black text-right font-mono text-slate-900 font-medium">
                              ₹ {Number(item.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          )}
                          {settings.showDiscount && (
                            <td className="py-2 px-2 border-r border-black text-right font-mono text-slate-700">
                              {item.discountPercent ? `${item.discountPercent}%` : "0%"}
                            </td>
                          )}
                          {settings.showTax && (
                            <td className="py-2 px-2 border-r border-black text-right font-mono text-[10px] text-slate-800">
                              {item.taxRate ? `${item.taxRate}%` : "0%"}
                            </td>
                          )}
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-950">
                            ₹ {Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Empty spacer rows so the grid reaches down and covers the whole template */}
                    {Array.from({ length: Math.max(0, 10 - (invoice.items || []).length) }).map((_, i) => (
                      <tr key={`filler-${i}`} className="h-9">
                        <td className="py-2 px-2.5 border-r border-black">&nbsp;</td>
                        <td className="py-2 px-2.5 border-r border-black">&nbsp;</td>
                        {settings.showHsn && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                        {settings.showQuantity && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                        {settings.showBatchNo && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                        {settings.showPricePerItem && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                        {settings.showDiscount && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                        {settings.showTax && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                        <td className="py-2 px-2.5">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Statutory GST Tax Summary - 100% Transparent */}
              {settings.showTax && hsnList.length > 0 && (
                <div className="border-t border-black bg-transparent p-2 text-[10px]">
                  <div className="font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Statutory GST Tax Summary {isInterState ? "(Inter-State IGST)" : "(Intra-State CGST + SGST)"}
                  </div>
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-black/30 text-slate-700 text-[9.5px] font-bold">
                        <th className="text-left py-0.5">HSN/SAC</th>
                        <th className="py-0.5">Taxable (₹)</th>
                        {!isInterState ? (
                          <>
                            <th className="py-0.5">CGST %</th>
                            <th className="py-0.5">CGST (₹)</th>
                            <th className="py-0.5">SGST %</th>
                            <th className="py-0.5">SGST (₹)</th>
                          </>
                        ) : (
                          <>
                            <th className="py-0.5">IGST %</th>
                            <th className="py-0.5">IGST (₹)</th>
                          </>
                        )}
                        <th className="py-0.5">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-slate-900 font-semibold">
                      {hsnList.map((row) => (
                        <tr key={row.hsn} className="border-b border-black/20">
                          <td className="text-left py-0.5">{row.hsn}</td>
                          <td className="py-0.5">{row.taxable.toFixed(2)}</td>
                          {!isInterState ? (
                            <>
                              <td className="py-0.5">{(row.rate / 2).toFixed(1)}%</td>
                              <td className="py-0.5">{row.cgst.toFixed(2)}</td>
                              <td className="py-0.5">{(row.rate / 2).toFixed(1)}%</td>
                              <td className="py-0.5">{row.sgst.toFixed(2)}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-0.5">{row.rate.toFixed(1)}%</td>
                              <td className="py-0.5">{row.igst.toFixed(2)}</td>
                            </>
                          )}
                          <td className="py-0.5 font-bold">{row.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals & Notes Section - 100% Transparent */}
              <div className="grid grid-cols-12 border-t border-black p-3 text-[11px] bg-transparent">
                <div className="col-span-7 pr-4 flex flex-col justify-between">
                  <div>
                    {invoice.notes && (
                      <div className="mb-2">
                        <div className="font-bold text-slate-900 text-[10px]">Note:</div>
                        <div className="text-slate-800 text-[10px] leading-tight font-medium">{invoice.notes}</div>
                      </div>
                    )}
                    <div className="text-[9.5px] font-bold text-slate-900 uppercase tracking-wider">
                      Terms and Conditions
                    </div>
                    <div className="whitespace-pre-line text-[9px] text-slate-800 mt-0.5 leading-snug font-medium">
                      {settings.termsAndConditions?.sales ||
                        "1. Goods once sold will not be accepted back or exchanged.\n2. Interest @ 18% per annum will be charged if payment is delayed beyond due date.\n3. All disputes are subject to local jurisdiction only."}
                    </div>
                  </div>

                  {/* Bank Details & QR & Barcode */}
                  <div className="mt-3 pt-2 border-t border-black/30 flex items-end justify-between gap-2">
                    {Boolean(settings.selectedBankAccount && settings.selectedBankAccount !== "none") && (
                      <div className="text-[9.5px] text-slate-800 space-y-0.5">
                        <div className="font-extrabold uppercase tracking-wider text-[9.5px] text-slate-950">
                          Bank & Payment Details:
                        </div>
                        <div>A/C Name: <strong>{bankHolderName}</strong></div>
                        <div>A/C No.: <strong className="font-mono">{bankAccountVal}</strong></div>
                        <div>IFSC: <strong className="font-mono">{bankIfsc}</strong> ({bankName})</div>
                        <div className="pt-1">
                          <svg ref={barcodeRef} className="max-w-[160px] h-8 bg-white/70 p-0.5 rounded" />
                        </div>
                      </div>
                    )}
                    {Boolean(settings.selectedPaymentQr && settings.selectedPaymentQr !== "none") && (
                      <div className="text-center shrink-0">
                        <canvas ref={upiQrRef} className="mx-auto rounded border border-slate-400 bg-white p-0.5" />
                        <span className="text-[8px] font-bold text-slate-800 block mt-0.5">Scan to Pay UPI</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-5 space-y-1.5 pl-3 border-l border-black/30 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-800">
                      <span className="font-medium">Taxable Amount</span>
                      <span className="font-mono font-bold text-slate-950">
                        ₹ {Number(invoice.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {settings.showTax && (
                      <>
                        {!isInterState ? (
                          <>
                            <div className="flex justify-between text-[10.5px] text-slate-800">
                              <span>SGST</span>
                              <span className="font-mono font-medium">
                                ₹ {Number(invoice.sgstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10.5px] text-slate-800">
                              <span>CGST</span>
                              <span className="font-mono font-medium">
                                ₹ {Number(invoice.cgstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between text-[10.5px] text-slate-800">
                            <span>IGST</span>
                            <span className="font-mono font-medium">
                              ₹ {Number(invoice.igstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {Number(invoice.roundOff || 0) !== 0 && (
                      <div className="flex justify-between text-[10px] text-slate-700">
                        <span>Round Off</span>
                        <span className="font-mono">
                          ₹ {Number(invoice.roundOff || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div
                      className="flex justify-between border-t border-black pt-1.5 text-[13px] font-black"
                      style={{ color: activeColor !== "#111111" ? activeColor : "#0f172a" }}
                    >
                      <span>Invoice Grand Total</span>
                      <span className="font-mono">
                        ₹ {Number(invoice.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[9.5px] italic text-slate-800 font-medium mt-1 leading-tight">
                      Total in words: {numberToWordsINR(Number(invoice.grandTotal || 0))}
                    </div>

                    {/* Paid & Balance Breakdown */}
                    {(Number(invoice.paidAmount || 0) > 0 || Number(invoice.balanceAmount || 0) > 0) && (
                      <div className="pt-2 mt-2 border-t border-black/30 text-[10.5px] space-y-1">
                        <div className="flex justify-between text-emerald-800 font-bold">
                          <span>Amount Received:</span>
                          <span className="font-mono">
                            ₹ {Number(invoice.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-rose-800 font-black">
                          <span>Balance Due:</span>
                          <span className="font-mono">
                            ₹ {Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : invoice.outstandingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Authorized Signatory Block */}
                  <div className="pt-6 text-right">
                    <div className="text-[10px] font-bold text-slate-900">
                      For {companyName}
                    </div>
                    <div className="h-10 flex items-center justify-end">
                      {settings.signatureUrl ? (
                        <img
                          src={settings.signatureUrl}
                          alt="Signature"
                          className="max-h-9 object-contain"
                        />
                      ) : (
                        <span className="text-[9px] text-slate-500 italic">Authorized Signatory</span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-700 font-bold border-t border-black/40 pt-0.5 inline-block min-w-[120px]">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Festive Footer Wish */}
            <div className="mt-3 text-center text-[10.5px] font-bold text-amber-950/90 tracking-wide">
              {skin.footerWish}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // LUXURY THEME LAYOUT (Gold/Executive borders & styling)
  // --------------------------------------------------------------------------
  if (layout === "luxury") {
    return (
      <div
        id={printableId}
        className="relative w-full max-w-[850px] mx-auto p-6 sm:p-8 text-[11px] bg-white rounded-lg shadow-sm border-2 border-amber-500/80 min-h-[920px] transition-all printable-invoice print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-w-0 print:rounded-none"
        style={{ fontFamily: settings.fontFamily || "Georgia, serif" }}
      >
        <div className="border-2 border-amber-600/40 p-4 sm:p-6 rounded-md bg-amber-50/10">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-amber-600/60 pb-4 mb-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-amber-600 text-white rounded text-[9px] font-bold tracking-widest uppercase mb-1">
                EXECUTIVE LUXURY INVOICE
              </span>
              <h1 className="text-2xl font-black tracking-tight text-amber-950 uppercase">
                {companyName}
              </h1>
              <p className="text-slate-600 text-xs mt-0.5">{companyAddress}</p>
              {companyGstin && (
                <p className="font-mono text-xs text-slate-700 mt-0.5">
                  GSTIN: <strong>{companyGstin}</strong> | Mobile: {companyPhone}
                </p>
              )}
            </div>

            <div className="text-right bg-white p-3 rounded-lg border border-amber-200 shadow-xs">
              <span className="block text-lg font-black text-amber-800">{docTitle}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase">ORIGINAL FOR RECIPIENT</span>
              <div className="mt-2 text-xs font-mono space-y-0.5">
                <div>Invoice No: <strong className="text-amber-900">#{invoice.invoiceNumber}</strong></div>
                <div>Date: <strong>{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</strong></div>
                {invoice.dueDate && <div>Due Date: <strong>{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</strong></div>}
              </div>
            </div>
          </div>

          {/* Receiver */}
          <div className="grid grid-cols-2 gap-4 bg-white p-3.5 rounded-lg border border-amber-200/80 mb-4 text-xs">
            <div>
              <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block mb-0.5">
                BILLED TO (RECEIVER)
              </span>
              <strong className="text-slate-900 text-sm block">{partyName}</strong>
              <p className="text-slate-600 mt-0.5">{partyAddress}</p>
              {partyGstin && <p className="font-mono text-slate-700 mt-0.5">GSTIN: {partyGstin}</p>}
              {partyPhone && <p className="text-slate-600">Mobile: {partyPhone}</p>}
            </div>
            <div>
              <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block mb-0.5">
                SHIPPED TO
              </span>
              <p className="text-slate-600">{shippingAddress}</p>
              <p className="text-slate-600 mt-1">Place of Supply: <strong>{invoice.placeOfSupply || "24 (Gujarat)"}</strong></p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border border-amber-300 rounded-lg overflow-hidden mb-4">
            <thead className="bg-amber-600 text-white font-bold">
              <tr>
                <th className="p-2 text-center w-10">#</th>
                <th className="p-2">DESCRIPTION</th>
                {settings.showHsn && <th className="p-2 text-center w-20">HSN</th>}
                <th className="p-2 text-center w-16">QTY</th>
                <th className="p-2 text-right w-20">RATE</th>
                {settings.showDiscount && <th className="p-2 text-right w-14">DISC</th>}
                {settings.showTax && <th className="p-2 text-right w-16">GST</th>}
                <th className="p-2 text-right w-24">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200/60 bg-white">
              {(invoice.items || []).map((it, i) => (
                <tr key={it.id || i} className="hover:bg-amber-50/40">
                  <td className="p-2 text-center font-mono">{i + 1}</td>
                  <td className="p-2">
                    <strong className="text-slate-900">{it.item?.name || it.description}</strong>
                    {settings.showItemDescription && it.description && it.description !== it.item?.name && (
                      <p className="text-[10px] text-slate-500">{it.description}</p>
                    )}
                  </td>
                  {settings.showHsn && <td className="p-2 text-center font-mono">{it.hsnCode || "-"}</td>}
                  <td className="p-2 text-center font-mono font-bold">{it.quantity} {it.unit || "PCS"}</td>
                  <td className="p-2 text-right font-mono">₹{Number(it.unitPrice || 0).toFixed(2)}</td>
                  {settings.showDiscount && <td className="p-2 text-right font-mono">{it.discountPercent || 0}%</td>}
                  {settings.showTax && <td className="p-2 text-right font-mono">{it.taxRate || 0}%</td>}
                  <td className="p-2 text-right font-mono font-bold">₹{Number(it.totalAmount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="grid grid-cols-12 gap-4 bg-white p-4 rounded-lg border border-amber-200">
            <div className="col-span-7 text-xs space-y-2">
              <div>
                <span className="font-bold text-amber-900 block text-[10px] uppercase">TERMS & CONDITIONS</span>
                <p className="text-slate-600 text-[10px] whitespace-pre-line leading-relaxed">
                  {settings.termsAndConditions?.sales || "Goods once sold will not be taken back."}
                </p>
              </div>
              <div className="pt-2 border-t border-amber-100 flex items-center gap-3">
                {Boolean(settings.selectedBankAccount && settings.selectedBankAccount !== "none") && (
                  <div className="text-[10px] text-slate-700">
                    <div>Bank: <strong>{bankName}</strong> | A/C: <strong className="font-mono">{bankAccountVal}</strong></div>
                    <div>IFSC: <strong className="font-mono">{bankIfsc}</strong> | Name: {bankHolderName}</div>
                  </div>
                )}
                {Boolean(settings.selectedPaymentQr && settings.selectedPaymentQr !== "none") && <canvas ref={upiQrRef} className="rounded border border-amber-200" />}
              </div>
            </div>

            <div className="col-span-5 text-xs space-y-1.5 pl-3 border-l border-amber-200">
              <div className="flex justify-between">
                <span>Taxable Amount</span>
                <span className="font-mono">₹{Number(invoice.taxableAmount || 0).toFixed(2)}</span>
              </div>
              {settings.showTax && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST Amount</span>
                    <span className="font-mono">₹{Number(invoice.cgstAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST Amount</span>
                    <span className="font-mono">₹{Number(invoice.sgstAmount || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-base font-black text-amber-950 border-t-2 border-amber-400 pt-2">
                <span>Total Amount:</span>
                <span className="font-mono">₹{Number(invoice.grandTotal || 0).toFixed(2)}</span>
              </div>
              <p className="text-[10px] italic text-slate-600 mt-1">
                {numberToWordsINR(Number(invoice.grandTotal || 0))}
              </p>
              <div className="pt-4 text-right">
                <span className="text-[10px] text-slate-500 block">For {companyName}</span>
                <span className="text-[9px] text-slate-400 mt-6 block">Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STYLISH & MODERN THEME (Matching brand color accent)
  // --------------------------------------------------------------------------
  return (
    <div
      id={printableId}
      className="relative w-full max-w-[850px] mx-auto p-6 sm:p-8 text-[11px] bg-white rounded-lg shadow-sm border border-slate-200 min-h-[920px] transition-all printable-invoice print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-w-0 print:rounded-none"
      style={{ fontFamily: settings.fontFamily || "Inter, sans-serif" }}
    >
      {/* Brand Accent Top Banner */}
      <div
        className="rounded-xl p-4 sm:p-5 mb-4 text-white shadow-xs flex justify-between items-start gap-4"
        style={{
          background:
            activeColor !== "#111111"
              ? `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}dd 100%)`
              : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        }}
      >
        <div className="space-y-1 flex-1">
          <div className="inline-block px-2 py-0.5 bg-black/25 rounded text-[9px] font-bold tracking-widest uppercase">
            GST TAX INVOICE
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{companyName}</h1>
          <p className="text-xs text-white/80">{companyAddress}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1 text-white/90">
            {companyGstin && <span>GSTIN: <strong>{companyGstin}</strong></span>}
            {companyPhone && <span>Mobile: <strong>{companyPhone}</strong></span>}
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg text-right shrink-0 shadow-sm text-slate-900 min-w-[150px]">
          <span className="block text-base font-black" style={{ color: activeColor }}>
            {docTitle}
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">ORIGINAL FOR RECIPIENT</span>
          <div className="mt-2 text-xs font-mono space-y-0.5">
            <div>Invoice: <strong>#{invoice.invoiceNumber}</strong></div>
            <div>Date: <strong>{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</strong></div>
            {invoice.dueDate && <div>Due: <strong>{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</strong></div>}
          </div>
        </div>
      </div>

      {/* Receiver Details */}
      <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
        <div>
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">
            BILLED TO:
          </span>
          <strong className="text-slate-900 text-sm block">{partyName}</strong>
          <p className="text-slate-600 mt-0.5">{partyAddress}</p>
          {partyGstin && <p className="font-mono text-slate-700 mt-0.5">GSTIN: {partyGstin}</p>}
          {partyPhone && <p className="text-slate-600">Mobile: {partyPhone}</p>}
          {settings.showPartyBalance && partyBalance > 0 && (
            <p className="text-rose-600 font-bold mt-1">
              Current Balance: ₹{partyBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <div>
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">
            SHIPPED TO:
          </span>
          <p className="text-slate-600">{shippingAddress}</p>
          <p className="text-slate-600 mt-1">Place of Supply: <strong>{invoice.placeOfSupply || "24 (Gujarat)"}</strong></p>
        </div>
      </div>

      {/* Item Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className="text-white font-bold"
              style={{
                backgroundColor: activeColor !== "#111111" ? activeColor : "#1e293b",
              }}
            >
              <th className="p-2.5 text-center w-10">#</th>
              <th className="p-2.5">ITEMS</th>
              {settings.showHsn && <th className="p-2.5 text-center w-20">HSN</th>}
              <th className="p-2.5 text-center w-16">QTY</th>
              <th className="p-2.5 text-right w-20">RATE</th>
              {settings.showDiscount && <th className="p-2.5 text-right w-14">DISC</th>}
              {settings.showTax && <th className="p-2.5 text-right w-16">GST</th>}
              <th className="p-2.5 text-right w-24">AMOUNT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {(invoice.items || []).map((it, i) => (
              <tr key={it.id || i} className="hover:bg-slate-50">
                <td className="p-2.5 text-center font-mono">{i + 1}</td>
                <td className="p-2.5">
                  <strong className="text-slate-900">{it.item?.name || it.description}</strong>
                  {settings.showItemDescription && it.description && it.description !== it.item?.name && (
                    <p className="text-[10px] text-slate-500">{it.description}</p>
                  )}
                </td>
                {settings.showHsn && <td className="p-2.5 text-center font-mono">{it.hsnCode || "-"}</td>}
                <td className="p-2.5 text-center font-mono font-bold">{it.quantity} {it.unit || "PCS"}</td>
                <td className="p-2.5 text-right font-mono">₹{Number(it.unitPrice || 0).toFixed(2)}</td>
                {settings.showDiscount && <td className="p-2.5 text-right font-mono">{it.discountPercent || 0}%</td>}
                {settings.showTax && <td className="p-2.5 text-right font-mono">{it.taxRate || 0}%</td>}
                <td className="p-2.5 text-right font-mono font-bold">₹{Number(it.totalAmount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Notes */}
      <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="col-span-7 text-xs space-y-2">
          <div>
            <span className="font-bold text-slate-700 block text-[10px] uppercase">TERMS AND CONDITIONS</span>
            <p className="text-slate-600 text-[10px] whitespace-pre-line leading-relaxed">
              {settings.termsAndConditions?.sales || "Goods once sold will not be accepted back or exchanged."}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
            {Boolean(settings.selectedBankAccount && settings.selectedBankAccount !== "none") && (
              <div className="text-[10px] text-slate-700">
                <div>Bank: <strong>{bankName}</strong> | A/C: <strong className="font-mono">{bankAccountVal}</strong></div>
                <div>IFSC: <strong className="font-mono">{bankIfsc}</strong> | A/C Name: {bankHolderName}</div>
                <div className="mt-1"><svg ref={barcodeRef} className="max-w-[150px] h-7" /></div>
              </div>
            )}
            {Boolean(settings.selectedPaymentQr && settings.selectedPaymentQr !== "none") && <canvas ref={upiQrRef} className="rounded border border-slate-300" />}
          </div>
        </div>

        <div className="col-span-5 text-xs space-y-1.5 pl-3 border-l border-slate-200">
          <div className="flex justify-between">
            <span>Taxable Value:</span>
            <span className="font-mono">₹{Number(invoice.taxableAmount || 0).toFixed(2)}</span>
          </div>
          {settings.showTax && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Central Tax (CGST):</span>
                <span className="font-mono">₹{Number(invoice.cgstAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>State Tax (SGST):</span>
                <span className="font-mono">₹{Number(invoice.sgstAmount || 0).toFixed(2)}</span>
              </div>
            </>
          )}
          <div
            className="flex justify-between text-base font-black border-t-2 border-slate-400 pt-2"
            style={{ color: activeColor !== "#111111" ? activeColor : "#0f172a" }}
          >
            <span>Grand Total:</span>
            <span className="font-mono">₹{Number(invoice.grandTotal || 0).toFixed(2)}</span>
          </div>
          <p className="text-[10px] italic text-slate-600 mt-1">
            {numberToWordsINR(Number(invoice.grandTotal || 0))}
          </p>

          <div className="pt-4 text-right">
            <span className="text-[10px] text-slate-600 font-bold block">For {companyName}</span>
            <div className="h-9 flex items-center justify-end">
              {settings.signatureUrl ? (
                <img src={settings.signatureUrl} alt="Signature" className="max-h-8 object-contain" />
              ) : null}
            </div>
            <span className="text-[9px] text-slate-400 border-t border-slate-300 pt-0.5 inline-block min-w-[110px]">
              Authorized Signatory
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
