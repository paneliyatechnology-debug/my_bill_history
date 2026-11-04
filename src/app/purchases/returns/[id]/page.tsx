"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { apiClient } from "../../../../lib/api-client";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import {
  DynamicThemedInvoice,
  DynamicInvoiceData,
  DynamicCompanyData,
} from "@/components/invoice/dynamic-themed-invoice";

export default function PurchaseReturnViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { lang, currentCompany } = useAuth();
  const returnId = params?.id as string;

  // Active Invoice Theme configured in Settings
  const { state: invoiceThemeState } = useActiveInvoiceTheme(currentCompany?.id);
  const [selectedPaperSize, setSelectedPaperSize] = useState<
    "A4" | "A5" | "US_LETTER" | "LEGAL" | "THERMAL_80" | "DL"
  >("A4");

  useEffect(() => {
    if ((invoiceThemeState as any)?.paperSize) {
      setSelectedPaperSize((invoiceThemeState as any).paperSize as any);
    }
  }, [(invoiceThemeState as any)?.paperSize]);

  // Determine whether this route is Debit Memo, Debit Note, or Purchase Return
  const isDebitMemo =
    pathname?.includes("debit-memo") || searchParams?.get("type") === "debit-memo";
  const isDebitNote =
    pathname?.includes("debit-note") || searchParams?.get("type") === "debit-note";

  const category = isDebitMemo
    ? "DEBIT_MEMO"
    : isDebitNote
    ? "DEBIT_NOTE"
    : "PURCHASE_RETURN";

  const docTitle = isDebitMemo
    ? lang === "gu"
      ? "ડેબિટ મેમો (Debit Memo)"
      : "Debit Memo"
    : isDebitNote
    ? lang === "gu"
      ? "ડેબિટ નોટ (Debit Note)"
      : "Debit Note"
    : lang === "gu"
    ? "ખરીદી પરત (Purchase Return)"
    : "Purchase Return";

  const backHref = isDebitMemo
    ? "/purchases/debit-memo"
    : isDebitNote
    ? "/purchases/debit-note"
    : "/purchases/returns";

  const editHref = isDebitMemo
    ? `/purchases/debit-memo/create?edit=${returnId}`
    : isDebitNote
    ? `/purchases/debit-note/create?edit=${returnId}`
    : `/purchases/returns/create?edit=${returnId}`;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const printDropdownRef = useRef<HTMLDivElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        printDropdownRef.current &&
        !printDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPrintDropdownOpen(false);
      }
      if (
        shareDropdownRef.current &&
        !shareDropdownRef.current.contains(event.target as Node)
      ) {
        setIsShareDropdownOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!returnId) return;
    setIsLoading(true);
    apiClient
      .get(`/purchases/debit-notes/${returnId}`)
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
    if (data && searchParams?.get("download") === "true") {
      downloadPdf();
    }
  }, [data, searchParams]);

  const returnNumber = data?.returnNumber || data?.voucherNumber || returnId?.slice(0, 8);
  const grandTotal = Number(data?.grandTotal || data?.totalAmount || 0);
  const party = data?.party || data?.purchaseInvoice?.party || {};
  const formattedDate = data?.returnDate
    ? new Date(data.returnDate).toLocaleDateString("en-GB")
    : "—";

  const downloadPdf = async () => {
    const element = document.getElementById("printable-purchase-return");
    if (!element) {
      window.print();
      return;
    }
    setIsGeneratingPdf(true);
    let originalTransform = "";
    let originalWidth = "";
    let wrapperEl: HTMLElement | null = null;
    try {
      originalTransform = element.style.transform;
      originalWidth = element.style.width;
      wrapperEl = element.closest(".invoice-viewport-wrapper") as HTMLElement;
      if (wrapperEl) {
        wrapperEl.style.height = "";
        wrapperEl.style.overflow = "";
      }
      element.style.transform = "none";
      element.style.width = "";

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format:
          selectedPaperSize === "A5"
            ? "a5"
            : selectedPaperSize === "THERMAL_80"
            ? [80, 200]
            : "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = selectedPaperSize === "THERMAL_80" ? 2 : 6;
      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const unscaledHeight = (canvas.height * printableWidth) / canvas.width;

      if (unscaledHeight <= printableHeight * 1.25) {
        const scaleFactor = Math.min(1, printableHeight / unscaledHeight);
        const finalWidth = printableWidth * scaleFactor;
        const finalHeight = unscaledHeight * scaleFactor;
        const posX = margin + (printableWidth - finalWidth) / 2;
        const posY = margin + (printableHeight - finalHeight) / 2;

        pdf.addImage(imgData, "PNG", posX, posY, finalWidth, finalHeight, undefined, "FAST");
      } else {
        let heightLeft = unscaledHeight;
        let position = margin;

        pdf.addImage(imgData, "PNG", margin, position, printableWidth, unscaledHeight, undefined, "FAST");
        heightLeft -= printableHeight;

        while (heightLeft > 25) {
          pdf.addPage();
          position = margin - (unscaledHeight - heightLeft);
          pdf.addImage(imgData, "PNG", margin, position, printableWidth, unscaledHeight, undefined, "FAST");
          heightLeft -= printableHeight;
        }
      }

      pdf.save(`${category}_${returnNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    } finally {
      if (element) {
        element.style.transform = originalTransform;
        element.style.width = originalWidth;
      }
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = (paper?: "A4" | "THERMAL_80") => {
    setIsPrintDropdownOpen(false);
    if (paper) {
      setSelectedPaperSize(paper);
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      window.print();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await apiClient.delete(`/purchases/debit-notes/${returnId}`);
      alert(lang === "gu" ? "સફળતાપૂર્વક ડિલીટ થઈ ગયું" : "Deleted successfully");
      router.push(backHref);
    } catch (err: any) {
      alert(err?.message || "Failed to delete");
    }
  };

  const handleShareWhatsApp = () => {
    setIsShareDropdownOpen(false);
    const comp = currentCompany?.tradeName || currentCompany?.legalName || "My Company";
    const text = `*${docTitle}*\nNumber: ${returnNumber}\nParty: ${
      party?.name || "Party"
    }\nDate: ${formattedDate}\nTotal: ₹${grandTotal.toFixed(2)}\n\nIssued by: ${comp}`;
    const phone = party?.phone ? String(party.phone).replace(/[^0-9]/g, "") : "";
    const waUrl = phone
      ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleCopyLink = () => {
    setIsShareDropdownOpen(false);
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert(lang === "gu" ? "લિંક કૉપિ થઈ ગઈ છે!" : "Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        <p className="font-semibold">{error || "Record not found"}</p>
        <Link href={backHref} className="mt-3 inline-block font-semibold underline">
          Back to {docTitle}
        </Link>
      </div>
    );
  }

  // ─── Build DynamicThemedInvoice structures ─────────────────────────────
  const returnDateIso = data?.returnDate
    ? data.returnDate.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const themedInvoiceData: DynamicInvoiceData = {
    id: data?.id,
    category,
    invoiceNumber: returnNumber,
    invoiceDate: returnDateIso,
    status: "ISSUED",
    placeOfSupply: party.stateCode
      ? `${party.stateCode} (${party.state || "State"})`
      : currentCompany?.stateCode
      ? `${currentCompany.stateCode} (${(currentCompany as any).state || "Gujarat"})`
      : "24 (Gujarat)",
    isB2B: !!party.gstin,
    taxableAmount: Number(data?.taxableAmount || 0),
    cgstAmount: Number(data?.cgstAmount || 0),
    sgstAmount: Number(data?.sgstAmount || 0),
    igstAmount: Number(data?.igstAmount || 0),
    grandTotal: grandTotal,
    paidAmount: grandTotal,
    balanceAmount: 0,
    notes: data?.reason || data?.notes,
    party: {
      id: party.id,
      name: party.name || data?.partyName || "Party",
      nameGujarati: party.nameGujarati,
      gstin: party.gstin || data?.partyGstin,
      stateCode: party.stateCode,
      phone: party.phone || data?.partyPhone,
      email: party.email || data?.partyEmail,
      billingAddress: party.billingAddress || data?.partyAddress,
    },
    items: (data?.items || []).map((row: any, idx: number) => {
      const itmName =
        row.item?.name || row.purchaseItem?.item?.name || row.name || `Item #${idx + 1}`;
      const itmHsn =
        row.item?.hsnCode || row.purchaseItem?.hsnCode || row.hsnCode || row.hsn;
      const qty = Number(row.quantity || 1);
      const unitPrice = Number(row.unitPrice || 0);
      const taxable = Number(row.taxableAmount || qty * unitPrice);
      const taxRate = Number(row.taxRate || 0);
      const taxAmt = Number(
        row.taxAmount ||
          (row.cgstAmount
            ? Number(row.cgstAmount) + Number(row.sgstAmount || 0)
            : (taxable * taxRate) / 100)
      );
      const totalAmt = Number(row.totalAmount || taxable + taxAmt);

      return {
        id: row.id || `row-${idx}`,
        description: itmName,
        hsnCode: itmHsn,
        quantity: qty,
        unitPrice: unitPrice,
        taxRate: taxRate,
        taxableAmount: taxable,
        cgstAmount: Number(row.cgstAmount || (row.igstAmount ? 0 : taxAmt / 2)),
        sgstAmount: Number(row.sgstAmount || (row.igstAmount ? 0 : taxAmt / 2)),
        igstAmount: Number(row.igstAmount || 0),
        totalAmount: totalAmt,
        unit: row.item?.primaryUom?.symbol || row.unit,
        item: {
          name: itmName,
          nameGujarati: row.item?.nameGujarati,
          sku: row.item?.sku,
        },
      };
    }),
  };

  const companyData: DynamicCompanyData = {
    tradeName: currentCompany?.tradeName || currentCompany?.legalName || "My Company",
    legalName: currentCompany?.legalName,
    addressLine1: (currentCompany as any)?.address || currentCompany?.city || "Gujarat, India",
    city: currentCompany?.city,
    gstin: currentCompany?.gstin,
    phone: (currentCompany as any)?.phone,
    stateCode: currentCompany?.stateCode || "24",
    email: currentCompany?.email,
    pan: (currentCompany as any)?.pan,
    upiVpa: (currentCompany as any)?.upiVpa,
    bankName: (currentCompany as any)?.bankName,
    accountNumber: (currentCompany as any)?.accountNumber,
    ifscCode: (currentCompany as any)?.ifscCode,
    branchName: (currentCompany as any)?.branchName,
    accountHolderName: (currentCompany as any)?.accountHolderName,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 print:space-y-0 print:max-w-none print:w-full print:m-0 print:p-0">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP ACTION HEADER (Hidden when printing)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title={`Back to ${docTitle}`}
          >
            ←
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-[#182230]">
              {docTitle} #{returnNumber}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E0F2FE] text-[#0284C7]">
              Credited
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download PDF */}
          <button
            type="button"
            onClick={downloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{isGeneratingPdf ? "Generating..." : "Download PDF"}</span>
          </button>

          {/* Print PDF Dropdown */}
          <div className="relative" ref={printDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPrintDropdownOpen(!isPrintDropdownOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Print PDF</span>
              <svg
                className="w-3 h-3 text-slate-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {isPrintDropdownOpen && (
              <div className="absolute left-0 top-10 z-40 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-xs">
                <button
                  type="button"
                  onClick={() => handlePrint("A4")}
                  className="flex w-full items-center h-9 px-3 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  Standard A4 Print
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint("THERMAL_80")}
                  className="flex w-full items-center h-9 px-3 hover:bg-slate-50 text-slate-700 border-t border-slate-100 cursor-pointer"
                >
                  Thermal Print (3 Inch)
                </button>
              </div>
            )}
          </div>

          {/* Theme Settings Shortcut */}
          <Link
            href="/app/settings/invoice/customize"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title={lang === "gu" ? "થીમ સેટિંગ્સ બદલો" : "Invoice Theme Settings"}
          >
            <span>🎨</span>
            <span>{lang === "gu" ? "થીમ સેટિંગ્સ" : "Theme"}</span>
          </Link>

          {/* Share Dropdown */}
          <div className="relative" ref={shareDropdownRef}>
            <button
              type="button"
              onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Share</span>
              <svg
                className="w-3 h-3 text-slate-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {isShareDropdownOpen && (
              <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-xs">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex w-full items-center h-9 px-3 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex w-full items-center h-9 px-3 hover:bg-slate-50 text-emerald-700 border-t border-slate-100 cursor-pointer"
                >
                  Share via WhatsApp
                </button>
              </div>
            )}
          </div>

          {/* Three dots menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs cursor-pointer"
            >
              ⋮
            </button>
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-10 z-40 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-xs">
                <Link
                  href={editHref}
                  className="flex w-full items-center h-9 px-3 hover:bg-slate-50 text-slate-700"
                >
                  Edit
                </Link>
                <Link
                  href="/app/settings/invoice/customize"
                  className="flex w-full items-center h-9 px-3 hover:bg-slate-50 text-slate-700 border-t border-slate-100"
                >
                  Change Theme
                </Link>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center h-9 px-3 hover:bg-rose-50 text-rose-600 border-t border-slate-100 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. THEMED INVOICE DOCUMENT
             Uses DynamicThemedInvoice so the user's saved theme in
             Settings (colors, fonts, festive skins, borders) applies here.
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl mx-auto min-w-0 invoice-viewport-wrapper print:block print:max-w-none print:w-full">
        <DynamicThemedInvoice
          invoice={themedInvoiceData}
          settings={{ ...invoiceThemeState, paperSize: selectedPaperSize }}
          company={companyData}
          printableId="printable-purchase-return"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. THERMAL MARGIN SETTINGS MODAL
         ───────────────────────────────────────────────────────────── */}
      {isMarginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 print:hidden">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-[15px] font-semibold text-slate-900">Thermal Print Margin Settings</h3>
              <button
                type="button"
                onClick={() => setIsMarginModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
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
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[13px] font-normal h-10"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Bottom (mm)</label>
                <input
                  type="number"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[13px] font-normal h-10"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Left (mm)</label>
                <input
                  type="number"
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[13px] font-normal h-10"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Right (mm)</label>
                <input
                  type="number"
                  value={marginRight}
                  onChange={(e) => setMarginRight(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[13px] font-normal h-10"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMarginModalOpen(false);
                alert("Thermal print margins saved successfully!");
              }}
              className="w-full rounded-xl bg-[#0F172A] py-2 text-[13px] font-medium text-white hover:bg-[#1268D3] cursor-pointer"
            >
              Save Margins
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
