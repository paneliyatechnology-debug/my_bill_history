"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { einvoiceApi, EInvoiceValidationError } from "@/lib/einvoice";
import { INDIAN_STATES } from "@/shared-types";
import { formatInr } from "@/components/design-system/tokens";

interface LineItem {
  id: string;
  itemId?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

const NIC_UNITS = [
  { code: "NOS", label: "NOS - Numbers" },
  { code: "PCS", label: "PCS - Pieces" },
  { code: "KGS", label: "KGS - Kilograms" },
  { code: "BOX", label: "BOX - Boxes" },
  { code: "MTR", label: "MTR - Meters" },
  { code: "SET", label: "SET - Sets" },
  { code: "BAG", label: "BAG - Bags" },
  { code: "LTR", label: "LTR - Liters" },
  { code: "TON", label: "TON - Tonnes" },
  { code: "QTL", label: "QTL - Quintal" },
  { code: "PAC", label: "PAC - Packs" },
  { code: "DOZ", label: "DOZ - Dozens" },
  { code: "SQM", label: "SQM - Square Meters" },
  { code: "OTH", label: "OTH - Others" },
];

export default function CreateEInvoicePage() {
  const router = useRouter();
  const { tenantContext, currentCompany, lang } = useAuth();

  // Document details
  const [documentType, setDocumentType] = useState<"TAX_INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE">("TAX_INVOICE");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplyCategory, setSupplyCategory] = useState("B2B");
  const [isReverseCharge, setIsReverseCharge] = useState(false);
  const [originalInvoiceRef, setOriginalInvoiceRef] = useState("");

  // Recipient details
  const [parties, setParties] = useState<any[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerCity, setBuyerCity] = useState("");
  const [buyerStateCode, setBuyerStateCode] = useState("24");
  const [buyerPincode, setBuyerPincode] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("24");

  // Conditional Ship-to / Dispatch-from
  const [showDispatchFrom, setShowDispatchFrom] = useState(false);
  const [dispatchName, setDispatchName] = useState("");
  const [dispatchAddress, setDispatchAddress] = useState("");
  const [dispatchCity, setDispatchCity] = useState("");
  const [dispatchStateCode, setDispatchStateCode] = useState("24");
  const [dispatchPincode, setDispatchPincode] = useState("");

  const [showShipTo, setShowShipTo] = useState(false);
  const [shipName, setShipName] = useState("");
  const [shipGstin, setShipGstin] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipStateCode, setShipStateCode] = useState("24");
  const [shipPincode, setShipPincode] = useState("");

  // Conditional Transport / Export
  const [showTransport, setShowTransport] = useState(false);
  const [transporterId, setTransporterId] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [distanceKm, setDistanceKm] = useState<number | "">("");
  const [transportDocNo, setTransportDocNo] = useState("");
  const [transportDocDate, setTransportDocDate] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"R" | "O">("R");

  const [showExport, setShowExport] = useState(false);
  const [shippingBillNo, setShippingBillNo] = useState("");
  const [shippingBillDate, setShippingBillDate] = useState("");
  const [portCode, setPortCode] = useState("");
  const [exportCountry, setExportCountry] = useState("");

  // Item rows
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "item-1",
      description: "",
      hsnCode: "",
      quantity: 1,
      unit: "NOS",
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxableAmount: 0,
      taxRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: 0,
    },
  ]);

  // Catalog items for lookup
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<EInvoiceValidationError[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Load parties, catalog items, and next invoice number
  useEffect(() => {
    async function init() {
      if (!tenantContext.companyId) return;
      try {
        const [partiesRes, itemsRes] = await Promise.all([
          apiClient.get<any[]>("/parties"),
          apiClient.get<any[]>("/items"),
        ]);
        setParties(Array.isArray(partiesRes) ? partiesRes : (partiesRes as any)?.data || []);
        setCatalogItems(Array.isArray(itemsRes) ? itemsRes : (itemsRes as any)?.data || []);
      } catch (e) {
        console.warn("Could not load initial master data", e);
      }
    }
    init();
  }, [tenantContext.companyId]);

  // Auto-generate invoice number if empty
  useEffect(() => {
    if (!invoiceNumber) {
      const num = `INV-${new Date().getFullYear().toString().slice(-2)}${String(Date.now()).slice(-4)}`;
      setInvoiceNumber(num);
    }
  }, [invoiceNumber]);

  // Update company place of supply defaults
  const companyState = currentCompany?.stateCode ? String(currentCompany.stateCode).padStart(2, "0") : "24";

  // Handle party selection
  const handleSelectParty = (partyId: string) => {
    setSelectedPartyId(partyId);
    const p = parties.find((x) => x.id === partyId);
    if (p) {
      setBuyerName(p.name || "");
      setBuyerGstin(p.gstin || "");
      const addr = p.billingAddress || {};
      setBuyerAddress(typeof addr === "string" ? addr : addr.line1 || addr.address || "");
      setBuyerCity(addr.city || "");
      const st = String(p.stateCode || addr.stateCode || "24").padStart(2, "0");
      setBuyerStateCode(st);
      setPlaceOfSupply(st);
      setBuyerPincode(addr.pincode || addr.pin || p.pincode || "");
    }
  };

  // Recalculate line item tax based on inter-state vs intra-state
  const recalculateLineItem = useCallback(
    (item: LineItem, pos: string): LineItem => {
      const isIntra = companyState === pos;
      const gross = Math.round(item.quantity * item.unitPrice * 100) / 100;
      let disc = 0;
      if (item.discountPercent > 0) {
        disc = Math.round(gross * (item.discountPercent / 100) * 100) / 100;
      } else {
        disc = Number(item.discountAmount || 0);
      }
      const taxable = Math.max(0, Math.round((gross - disc) * 100) / 100);

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIntra) {
        const halfRate = item.taxRate / 2;
        cgst = Math.round(taxable * (halfRate / 100) * 100) / 100;
        sgst = Math.round(taxable * (halfRate / 100) * 100) / 100;
      } else {
        igst = Math.round(taxable * (item.taxRate / 100) * 100) / 100;
      }

      const total = Math.round((taxable + cgst + sgst + igst) * 100) / 100;

      return {
        ...item,
        discountAmount: disc,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: total,
      };
    },
    [companyState]
  );

  // Recalculate all items when place of supply changes
  useEffect(() => {
    setItems((prev) => prev.map((it) => recalculateLineItem(it, placeOfSupply)));
  }, [placeOfSupply, recalculateLineItem]);

  // Item row change handler
  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const cur = { ...copy[index], [field]: value };

      if (field === "itemId" && value) {
        const cat = catalogItems.find((x) => x.id === value);
        if (cat) {
          cur.description = cat.name || cur.description;
          cur.hsnCode = cat.hsnCode || cur.hsnCode;
          cur.unitPrice = Number(cat.salePrice || cur.unitPrice || 0);
          cur.taxRate = Number(cat.taxRate !== undefined ? cat.taxRate : cur.taxRate);
          cur.unit = cat.primaryUom?.symbol || cur.unit;
        }
      }

      copy[index] = recalculateLineItem(cur, placeOfSupply);
      return copy;
    });
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: "",
      hsnCode: "",
      quantity: 1,
      unit: "NOS",
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxableAmount: 0,
      taxRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: 0,
    };
    setItems((prev) => [...prev, recalculateLineItem(newItem, placeOfSupply)]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Totals calculations
  const totals = useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach((it) => {
      taxable += it.taxableAmount;
      cgst += it.cgstAmount;
      sgst += it.sgstAmount;
      igst += it.igstAmount;
    });

    taxable = Math.round(taxable * 100) / 100;
    cgst = Math.round(cgst * 100) / 100;
    sgst = Math.round(sgst * 100) / 100;
    igst = Math.round(igst * 100) / 100;

    const rawTotal = taxable + cgst + sgst + igst;
    const rounded = Math.round(rawTotal);
    const roundOff = Math.round((rounded - rawTotal) * 100) / 100;

    return {
      taxable,
      cgst,
      sgst,
      igst,
      roundOff,
      grandTotal: rounded,
    };
  }, [items]);

  // Build API payload
  const buildInvoicePayload = () => {
    return {
      category: documentType,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: `${invoiceDate}T00:00:00.000Z`,
      placeOfSupply,
      isB2B: supplyCategory === "B2B",
      isReverseCharge,
      partyId: selectedPartyId || undefined,
      buyerDetails: {
        name: buyerName.trim(),
        gstin: buyerGstin.trim() || undefined,
        address: buyerAddress.trim(),
        city: buyerCity.trim(),
        stateCode: buyerStateCode,
        pincode: buyerPincode.trim(),
      },
      billingAddress: {
        line1: buyerAddress.trim(),
        city: buyerCity.trim(),
        stateCode: buyerStateCode,
        pincode: buyerPincode.trim(),
      },
      shippingAddress: showShipTo
        ? {
            name: shipName.trim(),
            gstin: shipGstin.trim(),
            line1: shipAddress.trim(),
            city: shipCity.trim(),
            stateCode: shipStateCode,
            pincode: shipPincode.trim(),
          }
        : undefined,
      dispatchDetails: showDispatchFrom
        ? {
            name: dispatchName.trim(),
            line1: dispatchAddress.trim(),
            city: dispatchCity.trim(),
            stateCode: dispatchStateCode,
            pincode: dispatchPincode.trim(),
          }
        : undefined,
      transportDetails: showTransport
        ? {
            transporterId: transporterId.trim() || undefined,
            transporterName: transporterName.trim() || undefined,
            distanceKm: Number(distanceKm) || 0,
            docNo: transportDocNo.trim() || undefined,
            docDate: transportDocDate || undefined,
            vehicleNo: vehicleNumber.trim() || undefined,
            vehicleType,
          }
        : undefined,
      exportDetails: showExport
        ? {
            shippingBillNo: shippingBillNo.trim(),
            shippingBillDate,
            portCode: portCode.trim(),
            countryCode: exportCountry.trim(),
          }
        : undefined,
      subTotal: totals.taxable,
      taxableAmount: totals.taxable,
      cgstAmount: totals.cgst,
      sgstAmount: totals.sgst,
      igstAmount: totals.igst,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: 0,
      balanceAmount: totals.grandTotal,
      items: items.map((it) => ({
        itemId: it.itemId || undefined,
        description: it.description,
        hsnCode: it.hsnCode,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        taxableAmount: it.taxableAmount,
        cgstAmount: it.cgstAmount,
        sgstAmount: it.sgstAmount,
        igstAmount: it.igstAmount,
        totalAmount: it.totalAmount,
      })),
    };
  };

  // Actions
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    setStatusMessage("Saving sales invoice draft...");
    try {
      const payload = buildInvoicePayload();
      const res = await apiClient.post<any>("/invoices", payload);
      const invoiceId = res?.id || res?.invoice?.id;
      if (invoiceId) {
        router.push(`/sales/e-invoices/${invoiceId}`);
      } else {
        router.push("/sales/e-invoices");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save invoice.");
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  const handleValidateFields = async () => {
    setIsSubmitting(true);
    setStatusMessage("Validating statutory fields...");
    try {
      // First save or check via endpoint
      const payload = buildInvoicePayload();
      const res = await apiClient.post<any>("/invoices", payload);
      const invoiceId = res?.id || res?.invoice?.id;
      if (invoiceId) {
        const valRes = await einvoiceApi.validate(invoiceId);
        setValidationErrors(valRes.errors);
        setShowValidationModal(true);
      }
    } catch (err: any) {
      alert(err.message || "Validation check failed.");
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  const handleGenerateEInvoice = async () => {
    setIsSubmitting(true);
    setStatusMessage("Registering on IRP portal...");
    try {
      const payload = buildInvoicePayload();
      const invoiceRes = await apiClient.post<any>("/invoices", payload);
      const invoiceId = invoiceRes?.id || invoiceRes?.invoice?.id;
      if (!invoiceId) throw new Error("Invoice could not be created.");

      const genRes = await einvoiceApi.generate(invoiceId);
      if (genRes.outcome === "SUCCEEDED" || genRes.irn) {
        router.push(`/sales/e-invoices/${invoiceId}`);
      } else {
        alert(genRes.message || "IRP submission failed. The invoice has been saved as draft.");
        router.push(`/sales/e-invoices/${invoiceId}`);
      }
    } catch (err: any) {
      alert(err.message || "E-Invoice generation did not succeed.");
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/sales/e-invoices" className="hover:text-emerald-700 transition">
              E-Invoices
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">New E-Invoice</span>
          </div>
          <h1 className="text-[22px] font-semibold text-[#182230]">
            {lang === "gu" ? "નવું ઈ-ઇનવોઇસ બનાવો" : "Create Statutory GST E-Invoice"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/sales/e-invoices"
            className="rounded-lg border border-slate-300 bg-white h-9 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Form (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* SECTION A: Document Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] text-emerald-800">1</span>
              A. Document & Supply Details
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Document Type *</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] focus:border-[#1677E8] focus:outline-none h-10"
                >
                  <option value="TAX_INVOICE">Tax Invoice (INV)</option>
                  <option value="CREDIT_NOTE">Credit Note (CRN)</option>
                  <option value="DEBIT_NOTE">Debit Note (DBN)</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Invoice Number *</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums font-normal focus:border-[#1677E8] focus:outline-none h-10"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Supply Category *</label>
                <select
                  value={supplyCategory}
                  onChange={(e) => {
                    setSupplyCategory(e.target.value);
                    if (e.target.value.startsWith("EXP") || e.target.value.startsWith("SEZ")) {
                      setShowExport(true);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] focus:border-[#1677E8] focus:outline-none h-10"
                >
                  <option value="B2B">B2B - Regular Business to Business</option>
                  <option value="SEZWP">SEZWP - SEZ with Tax Payment</option>
                  <option value="SEZWOP">SEZWOP - SEZ without Tax Payment</option>
                  <option value="EXPWP">EXPWP - Export with Tax Payment</option>
                  <option value="EXPWOP">EXPWOP - Export without Tax Payment</option>
                  <option value="DEXP">DEXP - Deemed Export</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Reverse Charge (RCM)</label>
                <select
                  value={isReverseCharge ? "Y" : "N"}
                  onChange={(e) => setIsReverseCharge(e.target.value === "Y")}
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] focus:border-[#1677E8] focus:outline-none h-10"
                >
                  <option value="N">No (Normal Tax)</option>
                  <option value="Y">Yes (Reverse Charge)</option>
                </select>
              </div>

              {documentType !== "TAX_INVOICE" && (
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Original Invoice Ref No</label>
                  <input
                    type="text"
                    value={originalInvoiceRef}
                    onChange={(e) => setOriginalInvoiceRef(e.target.value)}
                    placeholder="e.g. INV-2026-001"
                    className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION B & C: Supplier and Recipient */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] text-emerald-800">2</span>
              B. Recipient (Buyer) & Place of Supply
            </h2>

            {/* Buyer Master Selector */}
            <div className="mb-4">
              <label className="block text-[12px] font-medium text-slate-700 mb-1">Select Saved Customer / Party</label>
              <select
                value={selectedPartyId}
                onChange={(e) => handleSelectParty(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-[13px] focus:border-[#1677E8] focus:outline-none bg-slate-50/50 h-10"
              >
                <option value="">-- Choose from Master or Enter Details Manually --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.gstin ? `(${p.gstin})` : "(Unregistered)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Buyer Legal / Trade Name *</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Recipient firm name"
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] focus:border-[#1677E8] focus:outline-none font-normal h-10"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Buyer GSTIN *</label>
                <input
                  type="text"
                  value={buyerGstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setBuyerGstin(val);
                    if (val.length >= 2 && INDIAN_STATES[val.slice(0, 2)]) {
                      setBuyerStateCode(val.slice(0, 2));
                      setPlaceOfSupply(val.slice(0, 2));
                    }
                  }}
                  placeholder="24AAACB1234F1Z1 or URP"
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums font-normal focus:border-[#1677E8] focus:outline-none h-10"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Billing Address Line *</label>
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Street address, building, premises"
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] focus:border-[#1677E8] focus:outline-none h-10"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Location / City *</label>
                <input
                  type="text"
                  value={buyerCity}
                  onChange={(e) => setBuyerCity(e.target.value)}
                  placeholder="City name"
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] focus:border-[#1677E8] focus:outline-none h-10"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">State & State Code *</label>
                <select
                  value={buyerStateCode}
                  onChange={(e) => {
                    setBuyerStateCode(e.target.value);
                    setPlaceOfSupply(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] focus:border-[#1677E8] focus:outline-none h-10"
                >
                  {Object.entries(INDIAN_STATES).map(([code, st]) => (
                    <option key={code} value={code}>
                      {code} - {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Buyer PIN Code *</label>
                <input
                  type="text"
                  value={buyerPincode}
                  onChange={(e) => setBuyerPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit PIN"
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] tabular-nums focus:border-[#1677E8] focus:outline-none h-10"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Place of Supply (POS) *</label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-[13px] font-normal focus:border-[#1677E8] focus:outline-none bg-emerald-50/40 h-10"
                >
                  {Object.entries(INDIAN_STATES).map(([code, st]) => (
                    <option key={code} value={code}>
                      {code} - {st.name} {code === companyState ? "(Intra-state)" : "(Inter-state)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address Toggles */}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={showDispatchFrom}
                  onChange={(e) => setShowDispatchFrom(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-[#1677E8]"
                />
                Dispatch from a different warehouse/location?
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={showShipTo}
                  onChange={(e) => setShowShipTo(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-[#1677E8]"
                />
                Ship to a different delivery address?
              </label>
            </div>

            {/* Conditional Dispatch From Fields */}
            {showDispatchFrom && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800">Dispatch-From Details</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Location Name</label>
                    <input
                      type="text"
                      value={dispatchName}
                      onChange={(e) => setDispatchName(e.target.value)}
                      placeholder="Warehouse / Plant Name"
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white h-10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Address</label>
                    <input
                      type="text"
                      value={dispatchAddress}
                      onChange={(e) => setDispatchAddress(e.target.value)}
                      placeholder="Dispatch address"
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">City</label>
                    <input
                      type="text"
                      value={dispatchCity}
                      onChange={(e) => setDispatchCity(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">State Code</label>
                    <input
                      type="text"
                      value={dispatchStateCode}
                      onChange={(e) => setDispatchStateCode(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white tabular-nums h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">PIN Code</label>
                    <input
                      type="text"
                      value={dispatchPincode}
                      onChange={(e) => setDispatchPincode(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white tabular-nums h-10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Ship To Fields */}
            {showShipTo && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800">Ship-To Details</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Consignee Name</label>
                    <input
                      type="text"
                      value={shipName}
                      onChange={(e) => setShipName(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Consignee GSTIN</label>
                    <input
                      type="text"
                      value={shipGstin}
                      onChange={(e) => setShipGstin(e.target.value.toUpperCase())}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white tabular-nums h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Address</label>
                    <input
                      type="text"
                      value={shipAddress}
                      onChange={(e) => setShipAddress(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">City</label>
                    <input
                      type="text"
                      value={shipCity}
                      onChange={(e) => setShipCity(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">State Code</label>
                    <input
                      type="text"
                      value={shipStateCode}
                      onChange={(e) => setShipStateCode(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white tabular-nums h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">PIN Code</label>
                    <input
                      type="text"
                      value={shipPincode}
                      onChange={(e) => setShipPincode(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-[13px] bg-white tabular-nums h-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION D: Item Rows */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] text-emerald-800">3</span>
                C. Item Details & Tax Breakdown
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-[13px] font-medium text-emerald-700 hover:bg-emerald-100 transition"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2 px-2">Item Description *</th>
                    <th className="py-2 px-2 w-28">HSN/SAC *</th>
                    <th className="py-2 px-2 w-20">Qty *</th>
                    <th className="py-2 px-2 w-24">Unit *</th>
                    <th className="py-2 px-2 w-24 text-right">Rate *</th>
                    <th className="py-2 px-2 w-20 text-right">Disc %</th>
                    <th className="py-2 px-2 w-24 text-right">Taxable</th>
                    <th className="py-2 px-2 w-24">GST %</th>
                    <th className="py-2 px-2 w-24 text-right">Total</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      {/* Description */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="Product description"
                          className="w-full rounded border border-slate-300 p-1 text-[13px] h-10"
                        />
                      </td>

                      {/* HSN */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={row.hsnCode}
                          onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value.replace(/\D/g, "").slice(0, 8))}
                          placeholder="HSN code"
                          className="w-full rounded border border-slate-300 p-1 text-[13px] tabular-nums h-10"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                          className="w-full rounded border border-slate-300 p-1 text-[13px] tabular-nums h-10"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2">
                        <select
                          value={row.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className="w-full rounded border border-slate-300 p-1 text-[13px] tabular-nums h-10"
                        >
                          {NIC_UNITS.map((u) => (
                            <option key={u.code} value={u.code}>
                              {u.code}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Rate */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.unitPrice}
                          onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                          className="w-full rounded border border-slate-300 p-1 text-[13px] tabular-nums text-right h-10"
                        />
                      </td>

                      {/* Disc % */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.discountPercent}
                          onChange={(e) => handleItemChange(idx, "discountPercent", Number(e.target.value))}
                          className="w-full rounded border border-slate-300 p-1 text-[13px] tabular-nums text-right h-10"
                        />
                      </td>

                      {/* Taxable */}
                      <td className="py-2 px-2 text-right tabular-nums font-semibold text-slate-800">
                        ₹{formatInr(row.taxableAmount)}
                      </td>

                      {/* GST Rate */}
                      <td className="py-2 px-2">
                        <select
                          value={row.taxRate}
                          onChange={(e) => handleItemChange(idx, "taxRate", Number(e.target.value))}
                          className="w-full rounded border border-slate-300 p-1 text-[13px] tabular-nums h-10"
                        >
                          <option value="0">0%</option>
                          <option value="0.1">0.1%</option>
                          <option value="0.25">0.25%</option>
                          <option value="3">3%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>

                      {/* Total */}
                      <td className="py-2 px-2 text-right tabular-nums font-medium text-slate-900">
                        ₹{formatInr(row.totalAmount)}
                      </td>

                      {/* Remove */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION F: Optional Transport & Export Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-700">4</span>
                D. Transport & Export Details (Optional)
              </h2>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showTransport}
                    onChange={(e) => setShowTransport(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  Transport / Vehicle Details
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showExport}
                    onChange={(e) => setShowExport(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  Shipping Bill / Export
                </label>
              </div>
            </div>

            {showTransport && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Transporter ID</label>
                  <input
                    type="text"
                    value={transporterId}
                    onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                    placeholder="Transporter GSTIN"
                    className="w-full rounded border border-slate-300 p-1.5 tabular-nums text-[13px] font-normal h-10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Transporter Name</label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full rounded border border-slate-300 p-1.5 text-[13px] font-normal h-10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Distance (KM) *</label>
                  <input
                    type="number"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Distance in KM"
                    className="w-full rounded border border-slate-300 p-1.5 tabular-nums text-[13px] font-normal h-10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Transport Doc No (LR/RR)</label>
                  <input
                    type="text"
                    value={transportDocNo}
                    onChange={(e) => setTransportDocNo(e.target.value)}
                    className="w-full rounded border border-slate-300 p-1.5 tabular-nums text-[13px] font-normal h-10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Vehicle Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="GJ01AB1234"
                    className="w-full rounded border border-slate-300 p-1.5 tabular-nums font-normal text-[13px] font-normal h-10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full rounded border border-slate-300 p-1.5 text-[13px] font-normal h-10"
                  >
                    <option value="R">Regular (Normal)</option>
                    <option value="O">Over Dimensional Cargo (ODC)</option>
                  </select>
                </div>
              </div>
            )}

            {showExport && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Shipping Bill No</label>
                  <input
                    type="text"
                    value={shippingBillNo}
                    onChange={(e) => setShippingBillNo(e.target.value)}
                    className="w-full rounded border border-slate-300 p-1.5 tabular-nums text-[13px] font-normal h-10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Shipping Bill Date</label>
                  <input
                    type="date"
                    value={shippingBillDate}
                    onChange={(e) => setShippingBillDate(e.target.value)}
                    className="w-full rounded border border-slate-300 p-1.5 text-[13px] font-normal h-10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Port Code (6-char)</label>
                  <input
                    type="text"
                    value={portCode}
                    onChange={(e) => setPortCode(e.target.value.toUpperCase())}
                    placeholder="e.g. INMUN1"
                    className="w-full rounded border border-slate-300 p-1.5 tabular-nums text-[13px] font-normal h-10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Country Code (2-char)</label>
                  <input
                    type="text"
                    value={exportCountry}
                    onChange={(e) => setExportCountry(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="e.g. US"
                    className="w-full rounded border border-slate-300 p-1.5 tabular-nums font-normal text-[13px] font-normal h-10"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Sidebar Totals & Action Controls (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            {/* Totals Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="font-semibold text-slate-900 text-[15px] border-b border-slate-100 pb-2 mb-3">
                Tax & Invoice Summary
              </h3>

              <div className="space-y-2 text-xs tabular-nums">
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">Taxable Value:</span>
                  <span>₹{formatInr(totals.taxable)}</span>
                </div>

                {totals.cgst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">CGST:</span>
                    <span>₹{formatInr(totals.cgst)}</span>
                  </div>
                )}

                {totals.sgst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">SGST:</span>
                    <span>₹{formatInr(totals.sgst)}</span>
                  </div>
                )}

                {totals.igst > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">IGST:</span>
                    <span>₹{formatInr(totals.igst)}</span>
                  </div>
                )}

                {totals.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Round Off:</span>
                    <span>₹{formatInr(totals.roundOff)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2 font-sans">
                  <span>Grand Total:</span>
                  <span className="tabular-nums text-emerald-700">₹{formatInr(totals.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons Panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
              {statusMessage && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
                  <span>{statusMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateEInvoice}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#1677E8] py-2.5 text-[13px] font-medium text-white shadow-xs hover:bg-[#1268D3] transition disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Generate E-Invoice on IRP"}
              </button>

              <button
                type="button"
                onClick={handleValidateFields}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-emerald-600 bg-emerald-50/50 py-2 text-[13px] font-medium text-emerald-800 hover:bg-emerald-100 transition disabled:opacity-50"
              >
                Pre-Validate Statutory Fields
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Save as Normal Sales Draft
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Checklist Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h3 className="font-semibold text-slate-900 text-[15px]">
                Pre-Validation Results
              </h3>
              <button onClick={() => setShowValidationModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {validationErrors.length === 0 ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-center gap-3">
                  <span className="text-xl">✓</span>
                  <div>
                    <div className="font-bold">All mandatory validations passed!</div>
                    <div>Your invoice is ready to be registered on the Invoice Registration Portal.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-rose-800">
                    Fix the following issues before submitting:
                  </div>
                  {validationErrors.map((err, i) => (
                    <div key={i} className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-950">
                      <div className="font-semibold text-rose-900">{err.message}</div>
                      <div className="text-[10px] tabular-nums text-rose-700">Field: {err.field}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                onClick={() => setShowValidationModal(false)}
                className="rounded-lg border border-slate-300 h-9 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

