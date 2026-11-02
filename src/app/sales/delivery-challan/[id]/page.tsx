"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import {
  DynamicThemedInvoice,
  DynamicInvoiceData,
  DynamicCompanyData,
} from "@/components/invoice/dynamic-themed-invoice";
import { Modal } from "@/components/ui/modal";

export default function DeliveryChallanViewPage() {
  const params = useParams();
  const router = useRouter();
  const { lang, currentCompany } = useAuth();
  const challanId = params?.id as string;

  const { state: invoiceThemeState } = useActiveInvoiceTheme(currentCompany?.id);
  const [selectedPaperSize, setSelectedPaperSize] = useState<
    "A4" | "A5" | "US_LETTER" | "LEGAL" | "THERMAL_80" | "DL"
  >("A4");

  useEffect(() => {
    if ((invoiceThemeState as any)?.paperSize) {
      setSelectedPaperSize((invoiceThemeState as any).paperSize as any);
    }
  }, [(invoiceThemeState as any)?.paperSize]);

  const [challan, setChallan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Popovers & Modals
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState(false);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const printDropdownRef = useRef<HTMLDivElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

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

  const fetchChallan = async () => {
    if (!challanId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get(`/sales/delivery-challan/${challanId}`);
      setChallan(res?.data || res);
    } catch (err: any) {
      setError(err?.message || "Delivery Challan not found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChallan();
  }, [challanId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("printable-delivery-challan");
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

      pdf.save(`Delivery_Challan_${challan?.challanNumber || challanId}.pdf`);
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
      setTimeout(() => window.print(), 150);
    } else {
      window.print();
    }
  };

  const handleConvertToInvoice = async () => {
    if (!challan) return;
    setIsConverting(true);
    try {
      const res: any = await apiClient.post(
        `/sales/delivery-challan/${challan.id}/convert-to-invoice`,
        {},
        undefined,
        `conv_challan_${Date.now()}`
      );
      showToast(
        `Challan #${challan.challanNumber} converted to Tax Invoice #${
          res?.invoiceNumber || ""
        }!`
      );
      if (res?.id) {
        router.push(`/sales/invoices/${res.id}`);
      } else {
        await fetchChallan();
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to convert delivery challan.");
    } finally {
      setIsConverting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!challan) return;
    try {
      await apiClient.post(`/sales/delivery-challan/${challan.id}/cancel`, {
        reason: cancelReason || "Customer cancelled delivery",
      });
      setIsCancelModalOpen(false);
      setCancelReason("");
      showToast("Delivery challan cancelled.");
      await fetchChallan();
    } catch (err: any) {
      alert(err.message || "Failed to cancel delivery challan.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this delivery challan?")) return;
    try {
      await apiClient.delete(`/sales/delivery-challan/${challanId}`);
      alert("Delivery challan deleted successfully.");
      router.push("/sales/delivery-challan");
    } catch (err: any) {
      alert(err?.message || "Failed to delete delivery challan.");
    }
  };

  const handleShareWhatsApp = () => {
    setIsShareDropdownOpen(false);
    const comp = currentCompany?.tradeName || currentCompany?.legalName || "My Company";
    const text = `*Delivery Challan #${challan?.challanNumber}*\nParty: ${
      challan?.party?.name || challan?.warehouse?.name || "Customer"
    }\nDate: ${challan?.challanDate ? new Date(challan.challanDate).toLocaleDateString("en-GB") : "—"}\nAmount: ₹${Number(challan?.totalAmount || 0).toFixed(2)}\n\nDispatched by: ${comp}`;
    const phone = challan?.party?.phone ? String(challan.party.phone).replace(/[^0-9]/g, "") : "";
    const waUrl = phone
      ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleCopyLink = () => {
    setIsShareDropdownOpen(false);
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !challan) {
    return (
      <div className="max-w-xl mx-auto mt-12 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 space-y-3">
        <p className="font-bold text-base">{error || "Delivery Challan not found"}</p>
        <Link
          href="/sales/delivery-challan"
          className="inline-block rounded-xl bg-white px-4 py-2 text-xs font-semibold text-rose-700 border border-rose-300 hover:bg-rose-100"
        >
          Return to Delivery Challans
        </Link>
      </div>
    );
  }

  // ─── Map to DynamicInvoiceData ───────────────────────────────────────────
  const party = challan.party || {};
  const isClosed = challan.status === "CLOSED";
  const isCancelled = challan.status === "CANCELLED";
  const challanDateIso = challan.challanDate
    ? challan.challanDate.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const totalAmount = Number(challan.totalAmount || 0);
  const taxableAmount = Number(challan.taxableAmount || totalAmount);

  const themedInvoiceData: DynamicInvoiceData = {
    id: challan.id,
    category: "DELIVERY_CHALLAN",
    invoiceNumber: challan.challanNumber,
    invoiceDate: challanDateIso,
    status: isClosed ? "CLOSED" : isCancelled ? "CANCELLED" : "ISSUED",
    placeOfSupply: party.stateCode
      ? `${party.stateCode} (${party.state || "State"})`
      : currentCompany?.stateCode
      ? `${currentCompany.stateCode} (${(currentCompany as any).state || "Gujarat"})`
      : "24 (Gujarat)",
    isB2B: !!party.gstin,
    taxableAmount: taxableAmount,
    cgstAmount: Number(challan.cgstAmount || 0),
    sgstAmount: Number(challan.sgstAmount || 0),
    igstAmount: Number(challan.igstAmount || 0),
    grandTotal: totalAmount,
    paidAmount: isClosed ? totalAmount : 0,
    balanceAmount: isClosed ? 0 : totalAmount,
    notes: challan.notes || challan.reason,
    eWayBillRecord: challan.eWayBillNumber
      ? {
          ewayBillNo: challan.eWayBillNumber,
          vehicleNo: challan.vehicleNumber,
          dispatchDate: challan.challanDate,
          transportMode: challan.transportMode,
        }
      : undefined,
    party: {
      id: party.id,
      name: party.name || challan.warehouse?.name || "Direct / Self",
      nameGujarati: party.nameGujarati,
      gstin: party.gstin,
      stateCode: party.stateCode,
      phone: party.phone,
      email: party.email,
      billingAddress: party.billingAddress,
    },
    items: (challan.items || []).map((it: any, idx: number) => {
      const itmName = it.item?.name || it.description || `Item #${idx + 1}`;
      const itmHsn = it.item?.hsnCode || it.hsnCode;
      const qty = Number(it.quantity || 1);
      const unitPrice = Number(it.unitPrice || 0);
      const taxable = Number(it.taxableAmount || qty * unitPrice);
      const taxRate = Number(it.taxRate || 0);
      const taxAmt = Number(
        (it.cgstAmount ? Number(it.cgstAmount) + Number(it.sgstAmount || 0) : (taxable * taxRate) / 100)
      );
      const lineTotal = Number(it.totalAmount || taxable + taxAmt);

      return {
        id: it.id || `row-${idx}`,
        description: itmName,
        hsnCode: itmHsn,
        quantity: qty,
        unitPrice: unitPrice,
        taxRate: taxRate,
        taxableAmount: taxable,
        cgstAmount: Number(it.cgstAmount || (it.igstAmount ? 0 : taxAmt / 2)),
        sgstAmount: Number(it.sgstAmount || (it.igstAmount ? 0 : taxAmt / 2)),
        igstAmount: Number(it.igstAmount || 0),
        totalAmount: lineTotal,
        unit: it.item?.primaryUom?.symbol || it.unit || "PCS",
        batchNo: it.batch?.batchNumber || it.batchNo,
        item: {
          name: itmName,
          nameGujarati: it.item?.nameGujarati,
          sku: it.item?.sku,
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150 border border-slate-800">
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. TOP ACTION HEADER (Hidden when printing)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/sales/delivery-challan"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Back to Delivery Challans"
          >
            ←
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900">
              Delivery Challan #{challan.challanNumber}
            </h1>
            {isClosed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Converted
              </span>
            ) : isCancelled ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                Void
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Open</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Convert to Invoice Button */}
          {!isClosed && !isCancelled && (
            <button
              type="button"
              onClick={handleConvertToInvoice}
              disabled={isConverting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#174B43] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#123B35] transition-colors disabled:opacity-50 cursor-pointer"
              title="Convert this challan to a legal Tax Invoice"
            >
              <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{isConverting ? "Converting..." : "Convert to Tax Invoice"}</span>
            </button>
          )}

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Print PDF</span>
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
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
                  className="flex w-full items-center px-3 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  Standard A4 Print
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint("THERMAL_80")}
                  className="flex w-full items-center px-3 py-2 hover:bg-slate-50 text-slate-700 border-t border-slate-100 cursor-pointer"
                >
                  Thermal Print (3 Inch)
                </button>
              </div>
            )}
          </div>

          {/* Theme Settings Link */}
          <Link
            href="/app/settings/invoice/customize"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Invoice Theme Settings"
          >
            <span>🎨</span>
            <span>Theme</span>
          </Link>

          {/* Share Dropdown */}
          <div className="relative" ref={shareDropdownRef}>
            <button
              type="button"
              onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Share</span>
            </button>
            {isShareDropdownOpen && (
              <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-xs">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex w-full items-center px-3 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex w-full items-center px-3 py-2 hover:bg-slate-50 text-emerald-700 border-t border-slate-100 cursor-pointer"
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
                {!isClosed && !isCancelled && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsCancelModalOpen(true);
                    }}
                    className="flex w-full items-center px-3 py-2 hover:bg-amber-50 text-amber-700 cursor-pointer"
                  >
                    Cancel Challan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleDelete();
                  }}
                  className="flex w-full items-center px-3 py-2 hover:bg-rose-50 text-rose-600 border-t border-slate-100 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. THEMED DELIVERY CHALLAN DOCUMENT
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl mx-auto min-w-0 invoice-viewport-wrapper print:block print:max-w-none print:w-full">
        <DynamicThemedInvoice
          invoice={themedInvoiceData}
          settings={{ ...invoiceThemeState, paperSize: selectedPaperSize }}
          company={companyData}
          printableId="printable-delivery-challan"
        />
      </div>

      {/* Cancel Challan Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Delivery Challan"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to cancel delivery challan <strong>#{challan.challanNumber}</strong>?
          </p>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cancellation Reason</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Returned goods, order cancelled"
              className="w-full p-2.5 border border-[#E2E8E5] rounded-xl text-xs bg-[#F6F7F1] focus:bg-white focus:border-[#26A58A] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCancelSubmit}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer"
            >
              Confirm Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

