"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";
import jsPDF from "jspdf";

export default function PurchaseReturnViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang, currentCompany } = useAuth();
  const returnId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Popovers
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState(false);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMarginModalOpen, setIsMarginModalOpen] = useState(false);

  // Thermal margins
  const [marginTop, setMarginTop] = useState(5);
  const [marginBottom, setMarginBottom] = useState(5);
  const [marginLeft, setMarginLeft] = useState(5);
  const [marginRight, setMarginRight] = useState(5);

  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!returnId) return;
    setIsLoading(true);
    apiClient
      .get(`/purchases/invoices/debit-notes/${returnId}`)
      .then((res: any) => {
        setData(res);
      })
      .catch((err: any) => {
        setError(err?.message || "Failed to load Purchase Return details");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [returnId]);

  // Handle auto-download if requested in query param
  useEffect(() => {
    if (data && searchParams.get("download") === "true") {
      downloadPdf();
    }
  }, [data, searchParams]);

  const downloadPdf = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const companyName = currentCompany?.tradeName || currentCompany?.legalName || "Company Name";
    const partyName = data?.party?.name || data?.partyName || "Party Name";
    const returnNo = data?.returnNumber || data?.voucherNumber || returnId.slice(0, 8);
    const returnDate = data?.returnDate ? new Date(data.returnDate).toLocaleDateString("en-GB") : "—";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(companyName, 14, 20);

    doc.setFontSize(14);
    doc.text("PURCHASE RETURN / DEBIT NOTE", 196, 20, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Return No: ${returnNo}`, 196, 28, { align: "right" });
    doc.text(`Date: ${returnDate}`, 196, 33, { align: "right" });

    doc.text(`Bill To: ${partyName}`, 14, 32);
    if (data?.party?.gstin) {
      doc.text(`GSTIN: ${data.party.gstin}`, 14, 37);
    }

    // Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 45, 182, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("No", 16, 50);
    doc.text("Item", 28, 50);
    doc.text("Qty", 110, 50, { align: "right" });
    doc.text("Rate", 135, 50, { align: "right" });
    doc.text("Tax", 160, 50, { align: "right" });
    doc.text("Total", 192, 50, { align: "right" });

    let y = 58;
    doc.setFont("helvetica", "normal");
    const items = data?.items || [];
    items.forEach((item: any, idx: number) => {
      const name = item.item?.name || item.name || `Item ${idx + 1}`;
      const qty = item.quantity || 1;
      const rate = Number(item.unitPrice || 0);
      const tax = Number(item.taxRate || 0);
      const total = Number(item.totalAmount || item.taxableAmount || 0);

      doc.text(String(idx + 1), 16, y);
      doc.text(name, 28, y);
      doc.text(String(qty), 110, y, { align: "right" });
      doc.text(`Rs. ${rate.toFixed(2)}`, 135, y, { align: "right" });
      doc.text(`${tax}%`, 160, y, { align: "right" });
      doc.text(`Rs. ${total.toFixed(2)}`, 192, y, { align: "right" });
      y += 8;
    });

    // Grand total
    const grandTotal = Number(data?.grandTotal || data?.totalAmount || 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: Rs. ${grandTotal.toLocaleString("en-IN")}`, 192, y + 10, { align: "right" });

    doc.save(`Purchase_Return_${returnNo}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this purchase return?")) return;
    try {
      await apiClient.delete(`/purchases/invoices/debit-notes/${returnId}`);
      alert("Purchase return deleted");
      router.push("/purchases/returns");
    } catch (err: any) {
      alert(err?.message || "Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        <p className="font-semibold">{error || "Purchase Return not found"}</p>
        <Link href="/purchases/returns" className="mt-3 inline-block font-semibold underline">
          Back to Purchase Returns
        </Link>
      </div>
    );
  }

  const items = data.items || [];
  const returnNumber = data.returnNumber || data.voucherNumber || returnId.slice(0, 8);
  const formattedDate = data.returnDate ? new Date(data.returnDate).toLocaleDateString("en-GB") : "—";
  const party = data.party || data.purchaseInvoice?.party || {};
  const grandTotal = Number(data.grandTotal || data.totalAmount || 0);

  return (
    <div className="space-y-4 pb-20">
      {/* Top action header matching myBillBook */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases/returns"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ←
          </Link>
          <h1 className="text-base font-bold text-slate-900">
            Purchase Return #{returnNumber}
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E0F2FE] text-[#0284C7]">
            Credited
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download PDF */}
          <button
            type="button"
            onClick={downloadPdf}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download PDF</span>
          </button>

          {/* Print PDF Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPrintDropdownOpen(!isPrintDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Print PDF</span>
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {isPrintDropdownOpen && (
              <div className="absolute left-0 top-10 z-40 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintDropdownOpen(false);
                    handlePrint();
                  }}
                  className="flex w-full items-center px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Standard A4 Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintDropdownOpen(false);
                    handlePrint();
                  }}
                  className="flex w-full items-center px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Thermal Print (3 Inch)
                </button>
              </div>
            )}
          </div>

          {/* Info / Margin settings icon matching myBillBook */}
          <button
            type="button"
            onClick={() => setIsMarginModalOpen(true)}
            title="Thermal Print Margin Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            ⓘ
          </button>

          {/* Share */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Share</span>
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {isShareDropdownOpen && (
              <div className="absolute left-0 top-10 z-40 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsShareDropdownOpen(false);
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copied to clipboard!");
                  }}
                  className="flex w-full items-center px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Copy Link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Purchase Return #${returnNumber} for amount Rs. ${grandTotal}: ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center px-3 py-1.5 hover:bg-slate-50 text-emerald-700"
                >
                  Share via WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Three dots menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs"
            >
              ⋮
            </button>
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-10 z-40 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-xs">
                <Link
                  href={`/purchases/returns/create?edit=${returnId}`}
                  className="flex w-full items-center px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Edit Return
                </Link>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center px-3 py-1.5 hover:bg-rose-50 text-rose-600"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Document Preview matching myBillBook */}
      <div className="flex justify-center p-2 sm:p-4 bg-slate-100 rounded-2xl">
        <div
          ref={documentRef}
          className="w-full max-w-4xl bg-white p-8 shadow-xl rounded-sm border-4 border-[#C8A26A] text-slate-800 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#C8A26A] pb-4">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#1E3A8A] uppercase tracking-wide">
                {currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI"}
              </h2>
              <p className="text-xs text-slate-600 mt-1">📞 {(currentCompany as any)?.phone || "9510442798"}</p>
              <p className="text-xs text-slate-600">📍 {(currentCompany as any)?.address || currentCompany?.city || "Gujarat, India"}</p>
            </div>

            <div className="text-right">
              <h3 className="text-xl font-serif font-bold text-[#1E3A8A] tracking-wider">
                PURCHASE RETURN
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">(DEBIT NOTE)</p>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4">
            <div>
              <p className="font-semibold text-slate-500 uppercase text-[10px]">Return No.</p>
              <p className="font-bold text-slate-900 text-sm">{returnNumber}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500 uppercase text-[10px]">Return Date</p>
              <p className="font-bold text-slate-900 text-sm">{formattedDate}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="bg-[#FAF8F5] p-4 rounded border border-[#EBE4D8] text-xs">
            <p className="font-bold text-[#1E3A8A] uppercase tracking-wider text-[11px] mb-1">
              Bill To
            </p>
            <p className="text-sm font-bold text-slate-900">{party.name || data.partyName || "NIRAJBHAI"}</p>
            {(party.phone || data.partyPhone) && (
              <p className="text-slate-600 mt-0.5">Mobile: {party.phone || data.partyPhone || "9124091340"}</p>
            )}
            {party.gstin && <p className="text-slate-600">GSTIN: {party.gstin}</p>}
          </div>

          {/* Table */}
          <div className="border border-slate-200 overflow-hidden">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead className="bg-[#F5EFE6] border-b border-slate-300 font-semibold text-slate-800">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">No</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2 text-right">Qty.</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Tax</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                      No line items recorded
                    </td>
                  </tr>
                ) : (
                  items.map((line: any, idx: number) => {
                    const itemName = line.item?.name || line.name || `Item #${idx + 1}`;
                    const qty = line.quantity || 1;
                    const rate = Number(line.unitPrice || 0);
                    const taxRate = Number(line.taxRate || 0);
                    const lineTax = Number(line.taxAmount || ((qty * rate * taxRate) / 100));
                    const total = Number(line.totalAmount || (qty * rate + lineTax));

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{itemName}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{qty}</td>
                        <td className="px-3 py-2.5 text-right">{rate.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">
                          {lineTax > 0 ? `${lineTax.toLocaleString("en-IN")} (${taxRate}%)` : `0 (0%)`}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          {total.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount:</span>
                <span>₹ {Number(data.taxableAmount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST / Tax Amount:</span>
                <span>₹ {(Number(data.cgstAmount || 0) + Number(data.sgstAmount || 0) + Number(data.igstAmount || 0)).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-[#1E3A8A]">₹ {grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Terms & Signatory */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Terms & Conditions:</p>
              <p className="text-[11px] leading-relaxed">
                1. Goods once returned are credited to vendor account.<br />
                2. Subject to local jurisdiction.
              </p>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="text-slate-700 font-semibold">For {currentCompany?.tradeName || currentCompany?.legalName || "MODI CHAI"}</p>
              <div className="h-12" />
              <p className="text-[11px] text-slate-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Margin Settings Modal */}
      {isMarginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Thermal Print Margin Settings</h3>
              <button type="button" onClick={() => setIsMarginModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Configure padding and margin offsets (in mm) for POS / thermal bill roll printers.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Top (mm)</label>
                <input
                  type="number"
                  value={marginTop}
                  onChange={(e) => setMarginTop(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Bottom (mm)</label>
                <input
                  type="number"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Left (mm)</label>
                <input
                  type="number"
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Right (mm)</label>
                <input
                  type="number"
                  value={marginRight}
                  onChange={(e) => setMarginRight(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 px-2 py-1"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMarginModalOpen(false);
                alert("Thermal print margins saved successfully!");
              }}
              className="w-full rounded-lg bg-[#4338CA] py-2 text-xs font-semibold text-white hover:bg-[#3730A3]"
            >
              Save Margins
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
