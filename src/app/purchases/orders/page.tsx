"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  QuickSettingsModal,
  DEFAULT_PURCHASE_QUICK_SETTINGS,
  type QuickSettingsConfig,
} from "@/components/invoice/quick-settings-modal";
import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";
import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import {
  DynamicThemedInvoice,
  DynamicInvoiceData,
  DynamicCompanyData,
} from "@/components/invoice/dynamic-themed-invoice";

interface PurchaseOrderItem {
  id: string;
  name: string;
  description?: string;
  hsn?: string;
  quantity: number | string;
  unit?: string;
  unitPrice: number | string;
  discount?: number | string;
  discountType?: "%" | "₹";
  taxRate?: number;
  taxAmount?: number;
  taxableAmount?: number;
  totalAmount: number;
}

interface PurchaseOrderRecord {
  id: string;
  orderNumber: string;
  orderDate: string;
  validTill?: string;
  party: {
    id?: string;
    name: string;
    phone?: string;
    gstin?: string;
    billingAddress?: any;
    shippingAddress?: any;
    stateCode?: string;
  };
  items: PurchaseOrderItem[];
  taxableAmount: number;
  taxAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  grandTotal: number;
  advancePaid?: number;
  balanceAmount?: number;
  additionalCharges?: { name: string; amount: number }[];
  overallDiscount?: number;
  notes?: string;
  terms?: string;
  signatureUrl?: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  createdAt: string;
}

export default function PurchaseOrdersListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, currentCompany } = useAuth();

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

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState(false);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const printDropdownRef = useRef<HTMLDivElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  // State
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("OPEN");
  const [dateFilter, setDateFilter] = useState("Last 365 Days");
  const [sortField, setSortField] = useState<"orderDate" | "orderNumber" | "grandTotal">("orderDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dropdown states
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Detail / View Mode (When a row is clicked)
  const [selectedOrderForView, setSelectedOrderForView] = useState<PurchaseOrderRecord | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsConfig>(DEFAULT_PURCHASE_QUICK_SETTINGS);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<PurchaseOrderRecord | null>(null);

  // Ref for click outside dropdowns
  const statusRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setIsDateDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setIsPrintDropdownOpen(false);
      }
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setIsShareDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check URL query for order selection
  useEffect(() => {
    const viewId = searchParams?.get("id") || searchParams?.get("view");
    if (viewId && orders.length > 0) {
      const match = orders.find((o) => o.id === viewId || o.orderNumber === viewId);
      if (match) setSelectedOrderForView(match);
    }
  }, [searchParams, orders]);

  // Load from localStorage (or populate sample identical to myBillBook screenshot)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("billing_purchase_orders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
          return;
        }
      }

      // Default sample matching myBillBook interface
      const initialOrders: PurchaseOrderRecord[] = [
        {
          id: "po-2",
          orderNumber: "2",
          orderDate: "2026-10-22",
          validTill: "",
          party: {
            id: "party-cash",
            name: "Cash Sale",
            phone: "9510442798",
            gstin: "24AAAAA0000A1Z5",
          },
          items: [
            {
              id: "item-bopp",
              name: "BOPP TAPE",
              hsn: "391900",
              quantity: 2,
              unit: "PCS",
              unitPrice: 1680,
              discount: 0,
              taxRate: 18,
              taxAmount: 604.8,
              taxableAmount: 3360,
              totalAmount: 3964.8,
            },
          ],
          taxableAmount: 3360,
          taxAmount: 604.8,
          cgstAmount: 302.4,
          sgstAmount: 302.4,
          grandTotal: 3964.8,
          balanceAmount: 3964.8,
          status: "OPEN",
          createdAt: new Date().toISOString(),
        },
        {
          id: "po-1",
          orderNumber: "1",
          orderDate: "2026-10-22",
          validTill: "30 Days",
          party: {
            id: "party-adesh",
            name: "ADESH PATEL",
            phone: "7041436477",
            gstin: "24AAAAA0000A1Z5",
          },
          items: [
            {
              id: "item-raw",
              name: "3 INCH BOPP TAPE (BROWN)",
              hsn: "391910",
              quantity: 5,
              unit: "BOX",
              unitPrice: 1457.63,
              discount: 0,
              taxRate: 18,
              taxAmount: 1311.85,
              taxableAmount: 7288.15,
              totalAmount: 8600,
            },
          ],
          taxableAmount: 7288.15,
          taxAmount: 1311.85,
          cgstAmount: 655.92,
          sgstAmount: 655.93,
          grandTotal: 8600,
          balanceAmount: 8600,
          status: "OPEN",
          createdAt: new Date().toISOString(),
        },
      ];

      setOrders(initialOrders);
      localStorage.setItem("billing_purchase_orders", JSON.stringify(initialOrders));
    } catch {
      setOrders([]);
    }
  }, []);

  // Filter & Sort Logic
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Status filter
        if (statusFilter === "OPEN" && o.status !== "OPEN") return false;
        if (statusFilter === "CLOSED" && o.status !== "CLOSED") return false;

        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNumber = o.orderNumber.toLowerCase().includes(q);
          const matchParty = o.party?.name?.toLowerCase().includes(q);
          const matchPhone = o.party?.phone?.includes(q);
          const matchItem = o.items?.some((it) => it.name.toLowerCase().includes(q));
          if (!matchNumber && !matchParty && !matchPhone && !matchItem) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === "orderDate") {
          const tA = new Date(a.orderDate).getTime();
          const tB = new Date(b.orderDate).getTime();
          return sortOrder === "asc" ? tA - tB : tB - tA;
        }
        if (sortField === "orderNumber") {
          const nA = Number(a.orderNumber) || 0;
          const nB = Number(b.orderNumber) || 0;
          return sortOrder === "asc" ? nA - nB : nB - nA;
        }
        if (sortField === "grandTotal") {
          return sortOrder === "asc" ? a.grandTotal - b.grandTotal : b.grandTotal - a.grandTotal;
        }
        return 0;
      });
  }, [orders, statusFilter, searchTerm, sortField, sortOrder]);

  // Actions
  const handleDeleteOrder = (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase order?")) return;
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    localStorage.setItem("billing_purchase_orders", JSON.stringify(updated));
    setActiveMenuId(null);
    if (selectedOrderForView?.id === id) {
      setSelectedOrderForView(null);
    }
  };

  const handleDuplicateOrder = (order: PurchaseOrderRecord) => {
    const duplicated: PurchaseOrderRecord = {
      ...order,
      id: `po-${Date.now()}`,
      orderNumber: String(orders.length + 1),
      orderDate: new Date().toISOString().split("T")[0],
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...orders];
    setOrders(updated);
    localStorage.setItem("billing_purchase_orders", JSON.stringify(updated));
    setActiveMenuId(null);
  };

  const handleConvertToBill = (order: PurchaseOrderRecord) => {
    const prefill = {
      party: order.party,
      items: order.items,
      notes: `Converted from Purchase Order #${order.orderNumber}`,
      additionalCharges: order.additionalCharges,
      overallDiscount: order.overallDiscount,
    };
    sessionStorage.setItem("prefill_purchase_bill", JSON.stringify(prefill));
    router.push("/purchases/new");
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Preset Date Filter Options
  const datePresets = [
    "Today",
    "Yesterday",
    "This Week",
    "Last Week",
    "Last 7 Days",
    "This Month",
    "Previous Month",
    "This Quarter",
    "Previous Quarter",
    "This FY",
    "Previous FY",
    "Last 365 Days",
  ];

  /* -------------------------------------------------------------
     IF A ROW IS CLICKED -> DISPLAY DETAIL / PREVIEW VIEW
     (Unified Dynamic Themed Invoice format matching active Settings theme)
  -------------------------------------------------------------- */
  const handleDownloadPdf = async () => {
    const element = document.getElementById("printable-purchase-order");
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
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Purchase-Order-${selectedOrderForView?.orderNumber || "draft"}.pdf`);
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

  const handlePrintOrder = (paperSize: "A4" | "THERMAL_80" = "A4") => {
    setSelectedPaperSize(paperSize);
    setIsPrintDropdownOpen(false);
    if (paperSize === "THERMAL_80") {
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      window.print();
    }
  };

  if (selectedOrderForView) {
    const ord = selectedOrderForView;

    const compData: DynamicCompanyData = {
      id: currentCompany?.id,
      tradeName: currentCompany?.tradeName || currentCompany?.legalName || "My Company",
      legalName: currentCompany?.legalName || currentCompany?.tradeName || "My Company",
      gstin: currentCompany?.gstin || "",
      phone: (currentCompany as any)?.phone || (currentCompany as any)?.mobile || "",
      email: currentCompany?.email || "",
      addressLine1: (currentCompany as any)?.addressLine1 || (currentCompany as any)?.address || "",
      city: currentCompany?.city || "",
      pincode: (currentCompany as any)?.pincode || "",
      stateCode: currentCompany?.stateCode || "24",
      logoUrl: (currentCompany as any)?.logoUrl,
      signatureUrl: (currentCompany as any)?.signatureUrl,
      pan: (currentCompany as any)?.pan,
    };

    const themedInvoiceData: DynamicInvoiceData = {
      id: ord.id,
      category: "PURCHASE_ORDER",
      invoiceNumber: ord.orderNumber,
      invoiceDate: ord.orderDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      dueDate: ord.validTill || undefined,
      status: ord.status,
      placeOfSupply: ord.party?.stateCode
        ? `${ord.party.stateCode}`
        : currentCompany?.stateCode || "24 (Gujarat)",
      isB2B: !!ord.party?.gstin,
      taxableAmount: Number(ord.taxableAmount || 0),
      cgstAmount: Number(ord.cgstAmount || 0),
      sgstAmount: Number(ord.sgstAmount || 0),
      igstAmount: Number(ord.igstAmount || 0),
      grandTotal: Number(ord.grandTotal || 0),
      paidAmount: Number(ord.advancePaid || 0),
      balanceAmount: Number(
        ord.balanceAmount !== undefined
          ? ord.balanceAmount
          : (ord.grandTotal || 0) - (ord.advancePaid || 0)
      ),
      notes: ord.notes || ord.terms,
      party: {
        id: ord.party?.id,
        name: ord.party?.name || "Vendor",
        phone: ord.party?.phone,
        gstin: ord.party?.gstin,
        stateCode: ord.party?.stateCode,
        billingAddress: ord.party?.billingAddress,
        shippingAddress: ord.party?.shippingAddress,
      },
      items: (ord.items || []).map((it, idx) => {
        const qty = Number(it.quantity || 1);
        const unitPrice = Number(it.unitPrice || 0);
        const taxable = Number(it.taxableAmount || qty * unitPrice);
        const taxRate = Number(it.taxRate || 0);
        const taxAmt = Number(
          it.taxAmount !== undefined
            ? it.taxAmount
            : (taxable * taxRate) / 100
        );
        return {
          id: it.id || `item-${idx}`,
          description: it.name,
          hsnCode: it.hsn,
          quantity: qty,
          unitPrice: unitPrice,
          taxRate: taxRate,
          taxableAmount: taxable,
          cgstAmount: Number(ord.cgstAmount ? taxAmt / 2 : 0),
          sgstAmount: Number(ord.sgstAmount ? taxAmt / 2 : 0),
          igstAmount: Number(ord.igstAmount ? taxAmt : 0),
          totalAmount: Number(it.totalAmount || taxable + taxAmt),
          unit: it.unit || "PCS",
        };
      }),
    };

    return (
      <div className="min-h-screen bg-[#F0F3F8] text-slate-800 p-4 sm:p-6 font-sans">
        <div className="max-w-[1300px] mx-auto space-y-4">
          {/* Top Bar with Back, Title, Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs print:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrderForView(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                title="Back to List"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  Purchase Order #{ord.orderNumber}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF6EE] text-[#B93815] border border-[#FECDCA]">
                  {ord.status === "OPEN" ? "Open" : ord.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Paper Size Selector */}
              <select
                value={selectedPaperSize}
                onChange={(e) => setSelectedPaperSize(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <option value="A4">A4 (Standard)</option>
                <option value="A5">A5 (Half Page)</option>
                <option value="THERMAL_80">Thermal (80mm)</option>
                <option value="US_LETTER">Letter</option>
                <option value="LEGAL">Legal</option>
              </select>

              {/* Theme Settings Button */}
              <Link
                href="/settings/invoice-settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
                title="Change Invoice Theme in Settings"
              >
                <span className="text-sm">🎨</span>
                <span className="hidden sm:inline">Theme</span>
              </Link>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                <span>Download PDF</span>
              </button>

              {/* Print PDF Dropdown */}
              <div className="relative" ref={printDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsPrintDropdownOpen((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print</span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </button>
                {isPrintDropdownOpen && (
                  <div className="absolute right-0 top-9 z-50 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-xl text-xs">
                    <button
                      type="button"
                      onClick={() => handlePrintOrder("A4")}
                      className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span>📄</span>
                      <span>Print A4 / Standard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintOrder("THERMAL_80")}
                      className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                    >
                      <span>🧾</span>
                      <span>Print Thermal (80mm)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Share Dropdown */}
              <div className="relative" ref={shareDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsShareDropdownOpen((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </button>
                {isShareDropdownOpen && (
                  <div className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-xl text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsShareDropdownOpen(false);
                        const comp = currentCompany?.tradeName || currentCompany?.legalName || "My Company";
                        const text = `*Purchase Order #${ord.orderNumber}*\nVendor: ${ord.party?.name || "Vendor"}\nDate: ${formatDateDisplay(ord.orderDate)}\nTotal: ₹${Number(ord.grandTotal || 0).toFixed(2)}\n\nIssued by: ${comp}`;
                        const phone = ord.party?.phone ? String(ord.party.phone).replace(/[^0-9]/g, "") : "";
                        const waUrl = phone
                          ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(text)}`
                          : `https://wa.me/?text=${encodeURIComponent(text)}`;
                        window.open(waUrl, "_blank");
                      }}
                      className="w-full text-left px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span>💬</span>
                      <span>Share on WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsShareDropdownOpen(false);
                        navigator.clipboard.writeText(window.location.href);
                        alert("Order link copied to clipboard!");
                      }}
                      className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                    >
                      <span>🔗</span>
                      <span>Copy Link</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Convert to Purchase Invoice */}
              <button
                type="button"
                onClick={() => handleConvertToBill(ord)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#4C3CCE] hover:bg-[#4338CA] rounded-md transition-colors shadow-xs cursor-pointer"
              >
                <span>Convert to Purchase Invoice</span>
              </button>

              {/* Edit Order */}
              <button
                type="button"
                onClick={() => router.push(`/purchases/orders/create?edit=${ord.id}`)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer"
                title="Edit Order"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Unified Dynamic Themed Invoice Document */}
          <div className="w-full max-w-4xl mx-auto min-w-0 invoice-viewport-wrapper print:block print:max-w-none print:w-full">
            <DynamicThemedInvoice
              invoice={themedInvoiceData}
              settings={{ ...invoiceThemeState, paperSize: selectedPaperSize }}
              company={compData}
              printableId="printable-purchase-order"
            />
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     MAIN LIST VIEW (EXACT MYBILLBOOK DESIGN)
  -------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-[#F0F3F8] text-slate-800 p-4 sm:p-6 font-sans">
      <div className="max-w-[1550px] mx-auto space-y-4">
        {/* Top Header: Title and Tools */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Purchase Orders
          </h1>

          <div className="flex items-center gap-2">
            {/* Quick Settings Icon */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="relative p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Shortcuts Icon */}
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              title="Keyboard Shortcuts"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action / Filter Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left: Search + Date Preset + Status Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input Box */}
            <div className="relative flex items-center bg-white border border-slate-300 rounded-md shadow-2xs h-9">
              <span className="pl-2.5 pr-1.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Purchase Order"
                className="w-48 sm:w-60 text-xs text-slate-800 placeholder-slate-400 bg-transparent pr-2 focus:outline-hidden"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="pr-2 text-slate-400 hover:text-slate-600"
                >
                  <span className="text-xs font-bold">✕</span>
                </button>
              )}
              <div className="h-4 border-r border-slate-200" />
              <div className="px-2 text-[11px] font-semibold text-slate-600 flex items-center gap-1 cursor-pointer">
                <span>Invoice No. & Pa...</span>
                <span className="text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Date Preset Filter */}
            <div className="relative" ref={dateRef}>
              <button
                type="button"
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="h-9 inline-flex items-center gap-2 px-3 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{dateFilter}</span>
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {isDateDropdownOpen && (
                <div className="absolute left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-40 max-h-64 overflow-y-auto">
                  {datePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setDateFilter(preset);
                        setIsDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                        dateFilter === preset
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{preset}</span>
                      {dateFilter === preset && <span className="text-indigo-600 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Show Open Orders Filter Dropdown */}
            <div className="relative" ref={statusRef}>
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="h-9 inline-flex items-center justify-between gap-3 px-3 min-w-[170px] bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <span>
                  {statusFilter === "ALL"
                    ? "Show All Orders"
                    : statusFilter === "OPEN"
                    ? "Show Open Orders"
                    : "Show Closed Orders"}
                </span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      statusFilter === "ALL"
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Show All Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("OPEN");
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      statusFilter === "OPEN"
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Show Open Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("CLOSED");
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      statusFilter === "CLOSED"
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Show Closed Orders
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Create Purchase Order Button */}
          <div>
            <Link
              href="/purchases/orders/create"
              className="h-9 px-5 inline-flex items-center justify-center font-bold text-xs text-white bg-[#4C3CCE] hover:bg-[#4338CA] active:bg-[#3B2EB8] rounded-md transition-colors shadow-xs"
            >
              Create Purchase Order
            </Link>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F2F4F7] border-b border-slate-200 text-slate-700 font-semibold">
                  <th
                    className="py-3 px-4 cursor-pointer select-none"
                    onClick={() => {
                      if (sortField === "orderDate") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("orderDate");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <span className="text-slate-400 text-[10px]">⇅</span>
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer select-none"
                    onClick={() => {
                      if (sortField === "orderNumber") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("orderNumber");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Purchase Order Number</span>
                      <span className="text-slate-400 text-[10px]">⇅</span>
                    </div>
                  </th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Valid Till</th>
                  <th
                    className="py-3 px-4 cursor-pointer select-none"
                    onClick={() => {
                      if (sortField === "grandTotal") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortField("grandTotal");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Amount</span>
                      <span className="text-slate-400 text-[10px]">⇅</span>
                    </div>
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrderForView(ord)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {formatDateDisplay(ord.orderDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-semibold whitespace-nowrap">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-semibold whitespace-nowrap">
                        {ord.party?.name || "Cash Sale"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {ord.validTill || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-bold whitespace-nowrap">
                        ₹ {Number(ord.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            ord.status === "OPEN"
                              ? "bg-[#FEF6EE] text-[#B93815] border border-[#FECDCA]"
                              : ord.status === "CLOSED"
                              ? "bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ord.status === "OPEN" ? "Open" : ord.status === "CLOSED" ? "Closed" : ord.status}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === ord.id ? null : ord.id)
                          }
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>

                        {/* Kebab Action Popover Menu */}
                        {activeMenuId === ord.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-4 top-10 w-44 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-50 text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                router.push(`/purchases/orders/create?edit=${ord.id}`);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setHistoryOrder(ord);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <span>🕒</span>
                              <span>Edit History</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateOrder(ord)}
                              className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <span>📋</span>
                              <span>Duplicate</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleConvertToBill(ord)}
                              className="w-full text-left px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-medium border-t border-slate-100"
                            >
                              <span>📄</span>
                              <span>Convert to Bill</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-slate-100"
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 text-xl font-bold">
                          📑
                        </div>
                        <p className="font-bold text-slate-700 text-sm">No Purchase Orders found</p>
                        <p className="text-xs text-slate-400">
                          There are no purchase orders matching your search or filters.
                        </p>
                        <Link
                          href="/purchases/orders/create"
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#4C3CCE] hover:bg-[#4338CA] rounded-md transition-colors"
                        >
                          Create Purchase Order
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit History Modal */}
      {historyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Edit History — PO #{historyOrder.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                <div>
                  <p className="font-semibold text-slate-800">Order Created</p>
                  <p className="text-slate-500 text-[11px]">
                    Created on {formatDateDisplay(historyOrder.createdAt || historyOrder.orderDate)}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Party: {historyOrder.party?.name || "Cash Sale"} • Total: ₹ {Number(historyOrder.grandTotal).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryOrder(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <QuickSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={quickSettings}
          voucherType="purchase"
          onSave={(cfg) => {
            setQuickSettings(cfg);
            setIsSettingsOpen(false);
          }}
        />
      )}

      {/* Shortcuts Modal */}
      {isShortcutsOpen && (
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      )}
    </div>
  );
}
