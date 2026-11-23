"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { einvoiceApi, EInvoiceValidationError } from "@/lib/einvoice";
import { INDIAN_STATES, resolvePartyStateCode } from "@/shared-types";
import { formatInr } from "@/components/design-system/tokens";
import { CustomSelect, CustomCombobox } from "@/components/ui/dropdown-system";
import { CleanNumberInput } from "@/components/ui/clean-number-input";
import { X, Check } from "lucide-react";

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
  const [placeOfSupply, setPlaceOfSupply] = useState("");

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
      const st = resolvePartyStateCode(p, companyState);
      if (st) {
        setBuyerStateCode(st);
        setPlaceOfSupply(st);
      }
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
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link href="/sales/e-invoices" className="hover:text-[#1677E8] transition font-medium">
              E-Invoices
            </Link>
            <span className="text-slate-400">/</span>
            <span className="font-semibold text-slate-800">New E-Invoice</span>
          </div>
          <h1 className="text-[20px] sm:text-[22px] font-bold text-slate-900 tracking-tight">
            {lang === "gu" ? "નવું ઈ-ઇનવોઇસ બનાવો" : "Create Statutory GST E-Invoice"}
          </h1>
          <p className="mt-0.5 text-xs sm:text-[13px] text-slate-500">
            {lang === "gu"
              ? "નવા ઈ-ઇનવોઇસ માટે ગ્રાહક અને માલસામાનની વિગતો દાખલ કરો."
              : "Enter document, customer, and line item details to register with the IRP."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/sales/e-invoices"
            className="rounded-xl border border-slate-200/90 bg-white h-10 px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition"
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-[#1677E8] border border-blue-200">1</span>
              A. Document & Supply Details
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Document Type *</label>
                <CustomSelect
                  value={documentType}
                  onChange={(val) => setDocumentType(val as any)}
                  options={[
                    { value: "TAX_INVOICE", label: "Tax Invoice (INV)" },
                    { value: "CREDIT_NOTE", label: "Credit Note (CRN)" },
                    { value: "DEBIT_NOTE", label: "Debit Note (DBN)" },
                  ]}
                  className="w-full"
                />
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
                <CustomSelect
                  value={supplyCategory}
                  onChange={(val) => {
                    setSupplyCategory(val);
                    if (val.startsWith("EXP") || val.startsWith("SEZ")) {
                      setShowExport(true);
                    }
                  }}
                  options={[
                    { value: "B2B", label: "B2B - Regular Business to Business" },
                    { value: "SEZWP", label: "SEZWP - SEZ with Tax Payment" },
                    { value: "SEZWOP", label: "SEZWOP - SEZ without Tax Payment" },
                    { value: "EXPWP", label: "EXPWP - Export with Tax Payment" },
                    { value: "EXPWOP", label: "EXPWOP - Export without Tax Payment" },
                    { value: "DEXP", label: "DEXP - Deemed Export" },
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Reverse Charge (RCM)</label>
                <CustomSelect
                  value={isReverseCharge ? "Y" : "N"}
                  onChange={(val) => setIsReverseCharge(val === "Y")}
                  options={[
                    { value: "N", label: "No (Normal Tax)" },
                    { value: "Y", label: "Yes (Reverse Charge)" },
                  ]}
                  className="w-full"
                />
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-[#1677E8] border border-blue-200">2</span>
              B. Recipient (Buyer) & Place of Supply
            </h2>

            {/* Buyer Master Selector */}
            <div className="mb-4">
              <label className="block text-[12px] font-medium text-slate-700 mb-1">Select Saved Customer / Party</label>
              <CustomCombobox
                value={selectedPartyId}
                onChange={(val) => handleSelectParty(val)}
                options={parties.map((p) => ({
                  value: p.id,
                  label: p.name,
                  sublabel: p.gstin ? p.gstin : "Unregistered",
                }))}
                placeholder="-- Choose from Master or Enter Details Manually --"
                searchPlaceholder="Search customer by name or GSTIN..."
                clearable
                className="w-full"
              />
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
                <CustomCombobox
                  value={buyerStateCode}
                  onChange={(val) => {
                    setBuyerStateCode(val);
                    setPlaceOfSupply(val);
                  }}
                  options={Object.entries(INDIAN_STATES).map(([code, st]) => ({
                    value: code,
                    label: `${code} - ${st.name}`,
                  }))}
                  searchPlaceholder="Search state..."
                  className="w-full"
                />
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
                <CustomCombobox
                  value={placeOfSupply}
                  onChange={(val) => setPlaceOfSupply(val)}
                  options={Object.entries(INDIAN_STATES).map(([code, st]) => ({
                    value: code,
                    label: `${code} - ${st.name} ${code === companyState ? "(Intra-state)" : "(Inter-state)"}`,
                  }))}
                  searchPlaceholder="Search place of supply..."
                  className="w-full"
                />
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
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-[#1677E8] border border-blue-200">3</span>
                C. Item Details & Tax Breakdown
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1677E8] hover:bg-blue-100 transition-colors border border-blue-200/60 cursor-pointer"
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
                        <CleanNumberInput
                          value={row.quantity}
                          onChange={(val) => handleItemChange(idx, "quantity", val)}
                          className="w-full text-[13px] py-1 px-2 text-center tabular-nums bg-white border border-slate-300 rounded h-10 focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10"
                          placeholder="1"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2 min-w-[100px]">
                        <CustomSelect
                          value={row.unit}
                          onChange={(val) => handleItemChange(idx, "unit", val)}
                          options={NIC_UNITS.map((u) => ({
                            value: u.code,
                            label: u.code,
                          }))}
                          size="sm"
                          className="w-full"
                        />
                      </td>

                      {/* Rate */}
                      <td className="py-2 px-2 text-right">
                        <CleanNumberInput
                          value={row.unitPrice}
                          onChange={(val) => handleItemChange(idx, "unitPrice", val)}
                          className="w-full text-[13px] py-1 px-2 text-right tabular-nums bg-white border border-slate-300 rounded h-10 focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/10"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Disc % */}
                      <td className="py-2 px-2 text-right">
                        <CleanNumberInput
                          value={row.discountPercent}
                          onChange={(val) => handleItemChange(idx, "discountPercent", val)}
                          placeholder="0"
                          suffix={<span className="text-[10px] text-slate-400 font-bold ml-1">%</span>}
                          className="w-full text-[13px] text-right tabular-nums bg-transparent"
                          containerClassName="border border-slate-300 rounded px-2 py-1 h-10"
                        />
                      </td>

                      {/* Taxable */}
                      <td className="py-2 px-2 text-right tabular-nums font-semibold text-slate-800">
                        ₹{formatInr(row.taxableAmount)}
                      </td>

                      {/* GST Rate */}
                      <td className="py-2 px-2 min-w-[100px]">
                        <CustomSelect
                          value={String(row.taxRate)}
                          onChange={(val) => handleItemChange(idx, "taxRate", Number(val))}
                          options={[
                            { value: "0", label: "0%" },
                            { value: "0.1", label: "0.1%" },
                            { value: "0.25", label: "0.25%" },
                            { value: "3", label: "3%" },
                            { value: "5", label: "5%" },
                            { value: "12", label: "12%" },
                            { value: "18", label: "18%" },
                            { value: "28", label: "28%" },
                          ]}
                          size="sm"
                          className="w-full"
                        />
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
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 inline-flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
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
                  <CustomSelect
                    value={vehicleType}
                    onChange={(val) => setVehicleType(val as any)}
                    options={[
                      { value: "R", label: "Regular (Normal)" },
                      { value: "O", label: "Over Dimensional Cargo (ODC)" },
                    ]}
                    className="w-full"
                  />
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
                  <span className="tabular-nums text-slate-900">₹{formatInr(totals.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons Panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
              {statusMessage && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-[#1677E8] font-semibold flex items-center gap-2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1677E8] border-t-transparent"></div>
                  <span>{statusMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateEInvoice}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#1677E8] py-2.5 text-[13px] font-semibold text-white shadow-xs hover:bg-[#1268D3] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Processing..." : "Generate E-Invoice on IRP"}
              </button>

              <button
                type="button"
                onClick={handleValidateFields}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-blue-200 bg-blue-50/50 py-2 text-[13px] font-semibold text-[#1677E8] hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Pre-Validate Statutory Fields
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
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
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {validationErrors.length === 0 ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
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

