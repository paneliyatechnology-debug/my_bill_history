"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/auth-context";
import { apiClient } from "../../lib/api-client";
import { Modal } from "../../components/ui/modal";
import { StatCard } from "../../components/ui/stat-card";
import { BillScannerModal } from "./components/bill-scanner-modal";

interface PurchaseInvoice {
  id: string;
  vendorInvoiceNumber: string;
  invoiceDate: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  itcEligibility: string;
  party: {
    id: string;
    name: string;
    nameGujarati?: string;
    gstin?: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    totalAmount: number;
    item: {
      id: string;
      name: string;
      nameGujarati?: string;
    };
  }>;
}

interface PurchaseLine {
  itemId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export default function PurchasesPage() {
  const { lang, tenantContext, user } = useAuth();
  const canPay = ["SUPER_ADMIN", "ORG_ADMIN", "COMPANY_ADMIN", "ACCOUNTANT", "BRANCH_MANAGER"].includes(user?.role || "");
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Form State
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([
    { itemId: "", quantity: 1, unitPrice: 0, taxRate: 18 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payBill, setPayBill] = useState<PurchaseInvoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMode, setPayMode] = useState("CASH");
  const [payAccountId, setPayAccountId] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [payHistory, setPayHistory] = useState<any[]>([]);
  const [payAccounts, setPayAccounts] = useState<any[]>([]);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payKey, setPayKey] = useState("");

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/purchases", {
        search: searchTerm || undefined,
      });
      setInvoices(
        Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [],
      );
    } catch (err: any) {
      setError(err.message || "Failed to load purchase invoices.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const fetchDependencies = async () => {
    try {
      const [partiesRes, itemsRes, whRes]: any = await Promise.all([
        apiClient.get("/parties"),
        apiClient.get("/items"),
        apiClient.get("/tenants/warehouses"),
      ]);
      setParties(
        Array.isArray(partiesRes) ? partiesRes : partiesRes?.items || [],
      );
      setItemsList(Array.isArray(itemsRes) ? itemsRes : itemsRes?.items || []);
      setWarehouses(Array.isArray(whRes) ? whRes : []);
      if (Array.isArray(whRes) && whRes.length > 0) {
        const def = whRes.find((w: any) => w.isDefault) || whRes[0];
        setSelectedWarehouseId(def.id);
      }
    } catch (err) {
      console.error("Failed to load purchase dependencies", err);
    }
  };

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchPurchases();
    }
  }, [tenantContext.companyId, fetchPurchases]);

  const handleOpenModal = () => {
    fetchDependencies();
    setSelectedPartyId("");
    setVendorInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setLines([{ itemId: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleLineChange = (
    index: number,
    field: keyof PurchaseLine,
    value: any,
  ) => {
    const updated = [...lines];
    if (field === "itemId") {
      const foundItem = itemsList.find((it) => it.id === value);
      updated[index] = {
        ...updated[index],
        itemId: value,
        unitPrice: foundItem?.purchasePrice
          ? Number(foundItem.purchasePrice)
          : 0,
        taxRate:
          foundItem?.taxRate !== undefined ? Number(foundItem.taxRate) : 18,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setLines(updated);
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      { itemId: "", quantity: 1, unitPrice: 0, taxRate: 18 },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  // Calculations
  const calculatedTotals = lines.reduce(
    (acc, l) => {
      const taxable = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      const tax = (taxable * (Number(l.taxRate) || 0)) / 100;
      acc.taxable += taxable;
      acc.tax += tax;
      acc.grandTotal += taxable + tax;
      return acc;
    },
    { taxable: 0, tax: 0, grandTotal: 0 },
  );

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId) {
      setFormError(
        lang === "gu"
          ? "કૃપા કરીને વેપારી પસંદ કરો."
          : "Please select a supplier party.",
      );
      return;
    }
    if (!vendorInvoiceNumber.trim()) {
      setFormError(
        lang === "gu"
          ? "બિલ નંબર દાખલ કરો."
          : "Please enter vendor invoice number.",
      );
      return;
    }
    const validLines = lines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) {
      setFormError(
        lang === "gu"
          ? "ઓછામાં ઓછી એક વસ્તુ ઉમેરો."
          : "Please add at least one valid item.",
      );
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post("/purchases", {
        partyId: selectedPartyId,
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        invoiceDate,
        warehouseId: selectedWarehouseId || undefined,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
        })),
      });
      setIsModalOpen(false);
      fetchPurchases();
    } catch (err: any) {
      setFormError(err.message || "Failed to record purchase invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPayment = async (invoice: PurchaseInvoice) => {
    setPayBill(invoice);
    setPayAmount(Number(invoice.balanceAmount ?? invoice.grandTotal).toFixed(2));
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMode("CASH");
    setPayAccountId("");
    setPayReference("");
    setPayNotes("");
    setPayError(null);
    setPayKey(`pay-${invoice.id}-${Date.now()}`);
    try {
      const [history, ledger] = await Promise.all([
        apiClient.get<any>(`/purchases/${invoice.id}/payments`),
        apiClient.get<any>("/ledgers", { nature: "ASSET", limit: 100 }),
      ]);
      setPayHistory(history.payments || []);
      const rows = ledger.data || ledger.items || [];
      setPayAccounts(rows.filter((account: any) => /cash|bank/i.test(account.name || "")));
    } catch (err: any) {
      setPayError(err.message || "Payment details could not be loaded.");
    }
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payBill) return;
    setPaySubmitting(true);
    setPayError(null);
    try {
      await apiClient.post(
        `/purchases/${payBill.id}/payments`,
        {
          amount: payAmount,
          paymentDate: payDate,
          paymentMode: payMode,
          paidFromAccountId: payAccountId || undefined,
          referenceNo: payReference || undefined,
          notes: payNotes || undefined,
        },
        undefined,
        payKey,
      );
      setSuccessBanner(lang === "gu" ? "ચુકવણી નોંધાઈ." : "Supplier payment recorded.");
      setPayBill(null);
      fetchPurchases();
    } catch (err: any) {
      setPayError(err.message || "Payment was not recorded.");
    } finally {
      setPaySubmitting(false);
    }
  };

  const totalPurchasesAmount = invoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal || 0),
    0,
  );
  const totalTaxAmount = invoices.reduce(
    (sum, inv) =>
      sum +
      Number(inv.cgstAmount || 0) +
      Number(inv.sgstAmount || 0) +
      Number(inv.igstAmount || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === "gu"
                ? "ખરીદી બિલો (Purchase Bills)"
                : "Purchase Bills & Inward Stock"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1 ml-4.5">
            {lang === "gu"
              ? "વેપારી ખરીદી, ઇનપુટ ટેક્સ ક્રેડિટ (ITC) અને સ્ટોકની આવક"
              : "Vendor bills, Input Tax Credit (ITC), and inward inventory receipts"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              fetchDependencies();
              setIsScannerModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-saffron-light hover:bg-[#FFE6D0] text-primary border border-primary/25 text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>
              {lang === "gu"
                ? "AI સ્માર્ટ બિલ સ્કેનર (Scan Bill)"
                : "Scan Bill (AI Auto-Entry)"}
            </span>
          </button>

          <button
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white text-xs sm:text-sm font-bold rounded-xl shadow-card hover:shadow-hover transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>
              {lang === "gu" ? "મેન્યુઅલ બિલ ઉમેરો" : "+ Record Purchase Bill"}
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={lang === "gu" ? "કુલ ખરીદી બિલો" : "Total Purchase Bills"}
          value={invoices.length}
          icon={
            <svg
              className="w-5 h-5 text-[#F47721]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        <StatCard
          title={lang === "gu" ? "કુલ ખરીદી રકમ" : "Total Purchases Value"}
          value={`₹${totalPurchasesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          variant="success"
          icon={
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title={
            lang === "gu"
              ? "ઇનપુટ ટેક્સ ક્રેડિટ (ITC)"
              : "Total Input Tax Credit (ITC)"
          }
          value={`₹${totalTaxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          variant="warning"
          icon={
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === "gu"
                ? "બિલ નંબર અથવા વેપારી શોધો..."
                : "Search bill number or supplier..."
            }
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
          />
          <svg
            className="w-4 h-4 text-muted absolute left-3.5 top-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-border shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p>
              {lang === "gu"
                ? "ખરીદી બિલો લોડ થઈ રહ્યા છે..."
                : "Loading purchase bills..."}
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 font-medium">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <div className="w-12 h-12 rounded-full bg-saffron-light text-primary flex items-center justify-center mx-auto mb-2 text-xl font-bold">
              📦
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {lang === "gu"
                ? "કોઈ ખરીદી બિલ મળ્યા નથી."
                : "No purchase bills recorded yet."}
            </p>
            <p className="text-xs text-muted mt-1">
              {lang === "gu"
                ? "નવા સ્ટોક અને આઈટીસી માટે ખરીદી બિલ દાખલ કરો."
                : "Record a supplier invoice to update inventory and GST input tax credit."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-5 py-3">
                    {lang === "gu" ? "બિલ નંબર" : "Bill Number"}
                  </th>
                  <th className="px-5 py-3">
                    {lang === "gu" ? "તારીખ" : "Date"}
                  </th>
                  <th className="px-5 py-3">
                    {lang === "gu" ? "વેપારી" : "Supplier"}
                  </th>
                  <th className="px-5 py-3 text-right">
                    {lang === "gu" ? "કરપાત્ર રકમ" : "Taxable (₹)"}
                  </th>
                  <th className="px-5 py-3 text-right">
                    {lang === "gu" ? "ટેક્સ (ITC)" : "Tax (ITC) (₹)"}
                  </th>
                  <th className="px-5 py-3 text-right">
                    {lang === "gu" ? "કુલ રકમ" : "Grand Total (₹)"}
                  </th>
                  <th className="px-5 py-3 text-right">
                    {lang === "gu" ? "બાકી રકમ" : "Balance (₹)"}
                  </th>
                  <th className="px-5 py-3 text-center">
                    {lang === "gu" ? "આઈટીસી સ્ટેટસ" : "ITC Eligibility"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const tax =
                    Number(inv.cgstAmount || 0) +
                    Number(inv.sgstAmount || 0) +
                    Number(inv.igstAmount || 0);
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-saffron-very-light/60 transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {inv.vendorInvoiceNumber}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {lang === "gu" && inv.party.nameGujarati
                            ? inv.party.nameGujarati
                            : inv.party.name}
                        </div>
                        {inv.party.gstin && (
                          <div className="text-[10px] text-primary font-bold font-mono">
                            {inv.party.gstin}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                        ₹{Number(inv.taxableAmount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-700 font-semibold">
                        ₹{tax.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">
                        ₹{Number(inv.grandTotal).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-mono font-semibold text-slate-800">
                          ₹{Number(inv.balanceAmount ?? inv.grandTotal).toFixed(2)}
                        </div>
                        {canPay && Number(inv.balanceAmount ?? inv.grandTotal) > 0 ? (
                          <button
                            type="button"
                            className="mt-1 text-[11px] font-bold text-primary hover:text-primary-hover hover:underline inline-block"
                            onClick={() => openPayment(inv)}
                          >
                            {lang === "gu" ? "💳 ચુકવણી કરો" : "💳 Record Pay"}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {inv.itcEligibility || "INPUT"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(payBill)}
        onClose={() => setPayBill(null)}
        title={lang === "gu" ? "વેપારીને ચુકવણી" : "Pay supplier"}
      >
        {payBill ? (
          <form onSubmit={submitPayment} className="space-y-3">
            <p className="text-sm text-slate-600">
              {payBill.vendorInvoiceNumber} · {lang === "gu" ? "કુલ" : "Original"} ₹{Number(payBill.grandTotal).toFixed(2)} · {lang === "gu" ? "ચૂકવેલ" : "Paid"} ₹{Number(payBill.paidAmount || 0).toFixed(2)} · {lang === "gu" ? "બાકી" : "Remaining"} ₹{Number(payBill.balanceAmount ?? payBill.grandTotal).toFixed(2)}
            </p>
            {payError ? <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{payError}</p> : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-600">
                {lang === "gu" ? "રકમ" : "Amount"}
                <input className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                {lang === "gu" ? "તારીખ" : "Date"}
                <input type="date" className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={payDate} onChange={(event) => setPayDate(event.target.value)} />
              </label>
              <label className="text-xs text-slate-600">
                {lang === "gu" ? "રીત" : "Mode"}
                <select className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={payMode} onChange={(event) => setPayMode(event.target.value)}>
                  <option value="CASH">{lang === "gu" ? "રોકડ" : "Cash"}</option>
                  <option value="BANK_TRANSFER">{lang === "gu" ? "બેંક" : "Bank"}</option>
                  <option value="UPI_QR">UPI</option>
                  <option value="CHEQUE">{lang === "gu" ? "ચેક" : "Cheque"}</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">
                {lang === "gu" ? "ખાતું" : "Cash / bank account"}
                <select className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={payAccountId} onChange={(event) => setPayAccountId(event.target.value)}>
                  <option value="">{lang === "gu" ? "મૂળભૂત રોકડ" : "Default cash account"}</option>
                  {payAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs text-slate-600">
              {lang === "gu" ? "સંદર્ભ" : "Reference"}
              <input className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={payReference} onChange={(event) => setPayReference(event.target.value)} />
            </label>
            <label className="block text-xs text-slate-600">
              {lang === "gu" ? "નોંધ" : "Notes"}
              <input className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={payNotes} onChange={(event) => setPayNotes(event.target.value)} />
            </label>
            <div className="text-xs text-slate-500 space-y-1">
              {payHistory.length === 0 ? <p>{lang === "gu" ? "હજી ચુકવણી નથી." : "No payments yet."}</p> : payHistory.map((row) => (
                <p key={row.id}>{row.voucher?.voucherNumber} · ₹{Number(row.allocatedAmount).toFixed(2)} · {row.voucher?.voucherDate ? new Date(row.voucher.voucherDate).toLocaleDateString("en-IN") : ""}</p>
              ))}
            </div>
            <button type="submit" disabled={paySubmitting} className="px-3 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-50">
              {paySubmitting ? (lang === "gu" ? "સાચવી રહ્યા છીએ" : "Saving") : (lang === "gu" ? "ચુકવણી નોંધો" : "Record payment")}
            </button>
          </form>
        ) : null}
      </Modal>

      {/* Record Purchase Bill Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          lang === "gu"
            ? "નવું ખરીદી બિલ લખો (Record Purchase Bill)"
            : "Record Purchase Bill"
        }
      >
        <form onSubmit={handleSubmitPurchase} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "વેપારી પસંદ કરો *" : "Supplier Party *"}
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              >
                <option value="">
                  {lang === "gu"
                    ? "-- વેપારી પસંદ કરો --"
                    : "-- Select Supplier --"}
                </option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.gstin ? `(${p.gstin})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu"
                  ? "વેપારી બિલ નંબર *"
                  : "Vendor Invoice Number *"}
              </label>
              <input
                type="text"
                value={vendorInvoiceNumber}
                onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                placeholder="e.g. BILL-9921"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "બિલ તારીખ *" : "Invoice Date *"}
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "આવક ગોડાઉન" : "Receiving Warehouse"}
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {lang === "gu" ? "માલસામાન વિગત (Line Items)" : "Line Items"}
              </h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-[#F47721] hover:text-[#D95F12] font-semibold"
              >
                + {lang === "gu" ? "વસ્તુ ઉમેરો" : "Add Line"}
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {lines.map((line, idx) => {
                const lineTaxable =
                  (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                const lineTotal =
                  lineTaxable +
                  (lineTaxable * (Number(line.taxRate) || 0)) / 100;
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-5">
                      <select
                        value={line.itemId}
                        onChange={(e) =>
                          handleLineChange(idx, "itemId", e.target.value)
                        }
                        className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                        required
                      >
                        <option value="">
                          {lang === "gu"
                            ? "-- વસ્તુ પસંદ કરો --"
                            : "-- Select Item --"}
                        </option>
                        {itemsList.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="Qty"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs text-right bg-white"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.unitPrice}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="Rate"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs text-right bg-white"
                      />
                    </div>

                    <div className="col-span-2 text-right font-mono font-semibold text-slate-800">
                      ₹{lineTotal.toFixed(2)}
                    </div>

                    <div className="col-span-1 text-center">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-100 p-3 rounded-lg text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>
                {lang === "gu"
                  ? "કરપાત્ર રકમ (Taxable)"
                  : "Subtotal (Taxable):"}
              </span>
              <span className="font-mono">
                ₹{calculatedTotals.taxable.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                {lang === "gu"
                  ? "કુલ જીએસટી ટેક્સ (GST ITC):"
                  : "GST Tax (ITC):"}
              </span>
              <span className="font-mono">
                ₹{calculatedTotals.tax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-sm">
              <span>
                {lang === "gu" ? "કુલ રકમ (Grand Total):" : "Grand Total:"}
              </span>
              <span className="font-mono text-indigo-700">
                ₹{calculatedTotals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              {isSubmitting
                ? lang === "gu"
                  ? "સાચવી રહ્યું છે..."
                  : "Saving..."
                : lang === "gu"
                  ? "ખરીદી બિલ સાચવો"
                  : "Record Purchase Bill"}
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Bill Scanner & Review Modal */}
      <BillScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onSuccess={(inv) => {
          setSuccessBanner(
            lang === "gu"
              ? `ખરીદી બિલ #${inv.vendorInvoiceNumber} સફળતાપૂર્વક કન્ફર્મ થયું અને સ્ટોકમાં ઉમેરાયું!`
              : `Purchase Invoice #${inv.vendorInvoiceNumber} successfully posted to stock & ledger!`,
          );
          fetchPurchases();
        }}
        lang={lang}
        parties={parties}
        itemsList={itemsList}
        warehouses={warehouses}
      />
    </div>
  );
}
