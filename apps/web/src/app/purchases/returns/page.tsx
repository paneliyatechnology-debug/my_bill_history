"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { StatCard } from "../../../components/ui/stat-card";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface ReturnItem {
  id: string;
  purchaseItemId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  item: {
    id: string;
    name: string;
    nameGujarati?: string;
  };
}

interface PurchaseReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  reason?: string;
  reasonGujarati?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  party: {
    id: string;
    name: string;
    nameGujarati?: string;
    gstin?: string;
    phone?: string;
  };
  purchaseInvoice: {
    id: string;
    vendorInvoiceNumber: string;
    invoiceDate: string;
    grandTotal: number;
    balanceAmount: number;
  };
  items: ReturnItem[];
}

interface PurchaseInvoiceDetails {
  id: string;
  vendorInvoiceNumber: string;
  invoiceDate: string;
  placeOfSupply: string;
  grandTotal: number;
  balanceAmount: number;
  party: {
    id: string;
    name: string;
    nameGujarati?: string;
    gstin?: string;
    stateCode?: string;
  };
  items: Array<{
    id: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxableAmount: number;
    totalAmount: number;
    item: {
      id: string;
      name: string;
      nameGujarati?: string;
      sku?: string;
    };
  }>;
  returns?: Array<{
    items: Array<{
      purchaseItemId: string;
      quantity: number;
    }>;
  }>;
}

interface ReturnLineForm {
  purchaseItemId: string;
  itemId: string;
  itemName: string;
  itemNameGujarati?: string;
  originalQty: number;
  previouslyReturnedQty: number;
  returnableQty: number;
  returnQty: number;
  unitPrice: number;
  taxRate: number;
  taxable: number;
  taxAmount: number;
  total: number;
}

export default function PurchaseReturnsPage() {
  const { lang } = useAuth();
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPartyFilter, setSelectedPartyFilter] = useState("");

  // Master lists
  const [partiesList, setPartiesList] = useState<any[]>([]);

  // Create Return Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [supplierBills, setSupplierBills] = useState<any[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [selectedPurchase, setSelectedPurchase] =
    useState<PurchaseInvoiceDetails | null>(null);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);

  // Form Fields
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [returnReason, setReturnReason] = useState("");
  const [returnReasonGujarati, setReturnReasonGujarati] = useState("");
  const [lines, setLines] = useState<ReturnLineForm[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Details View Modal State
  const [selectedReturnDetails, setSelectedReturnDetails] =
    useState<PurchaseReturn | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // 1. Fetch Purchase Returns List
  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/purchase-returns", {
        search: searchTerm || undefined,
        partyId: selectedPartyFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReturns(
        Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [],
      );
    } catch (err: any) {
      setError(err.message || "Failed to load purchase returns.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedPartyFilter, startDate, endDate]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Load parties for filter & creation
  useEffect(() => {
    apiClient
      .get("/parties")
      .then((res: any) => {
        const list = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
            ? res
            : [];
        setPartiesList(
          list.filter((p: any) => p.type === "SUPPLIER" || !p.type),
        );
      })
      .catch(() => {});
  }, []);

  // When supplier is selected in Create modal, fetch their purchase invoices
  const handleSupplierChange = async (partyId: string) => {
    setSelectedPartyId(partyId);
    setSelectedPurchaseId("");
    setSelectedPurchase(null);
    setLines([]);
    setFormError(null);
    if (!partyId) {
      setSupplierBills([]);
      return;
    }

    setIsLoadingBills(true);
    try {
      const res: any = await apiClient.get("/purchases", { partyId });
      const bills = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
          ? res
          : [];
      setSupplierBills(bills);
    } catch (err: any) {
      setFormError("Failed to fetch purchase invoices for this supplier.");
    } finally {
      setIsLoadingBills(false);
    }
  };

  // When purchase invoice is selected in Create modal, fetch its full details with return history
  const handlePurchaseSelect = async (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setSelectedPurchase(null);
    setLines([]);
    setFormError(null);
    if (!purchaseId) return;

    setIsLoadingPurchase(true);
    try {
      const res: any = await apiClient.get(`/purchases/${purchaseId}`);
      setSelectedPurchase(res);

      // Build previously returned quantities map
      const prevMap = new Map<string, number>();
      if (Array.isArray(res.returns)) {
        for (const ret of res.returns) {
          if (Array.isArray(ret.items)) {
            for (const itm of ret.items) {
              const cur = prevMap.get(itm.purchaseItemId) || 0;
              prevMap.set(itm.purchaseItemId, cur + Number(itm.quantity));
            }
          }
        }
      }

      // Initialize lines with available quantities
      const formLines: ReturnLineForm[] = res.items.map((pi: any) => {
        const origQty = Number(pi.quantity);
        const prevReturned = prevMap.get(pi.id) || 0;
        const returnable = Math.max(0, origQty - prevReturned);
        return {
          purchaseItemId: pi.id,
          itemId: pi.itemId,
          itemName: pi.item?.name || "Item",
          itemNameGujarati: pi.item?.nameGujarati,
          originalQty: origQty,
          previouslyReturnedQty: prevReturned,
          returnableQty: returnable,
          returnQty: 0,
          unitPrice: Number(pi.unitPrice),
          taxRate: Number(pi.taxRate),
          taxable: 0,
          taxAmount: 0,
          total: 0,
        };
      });

      setLines(formLines);
    } catch (err: any) {
      setFormError("Failed to load invoice items.");
    } finally {
      setIsLoadingPurchase(false);
    }
  };

  // Update return quantity for a specific line item
  const handleQtyChange = (index: number, val: string) => {
    const qty = parseFloat(val) || 0;
    const newLines = [...lines];
    const target = newLines[index];

    if (qty < 0) {
      setFormError(
        lang === "gu"
          ? "પરત કરેલ જથ્થો ઋણ (negative) ન હોઈ શકે."
          : "Return quantity cannot be negative.",
      );
      return;
    }

    if (qty > target.returnableQty) {
      setFormError(
        lang === "gu"
          ? `જથ્થો ઉપલબ્ધ બાકી જથ્થા (${target.returnableQty}) કરતાં વધુ ન હોઈ શકે.`
          : `Quantity cannot exceed remaining returnable quantity (${target.returnableQty}).`,
      );
    } else {
      setFormError(null);
    }

    target.returnQty = qty;
    target.taxable = Number((qty * target.unitPrice).toFixed(2));
    target.taxAmount = Number(
      ((target.taxable * target.taxRate) / 100).toFixed(2),
    );
    target.total = Number((target.taxable + target.taxAmount).toFixed(2));

    setLines(newLines);
  };

  // Live Summary Calculations
  const summary = useMemo(() => {
    let sumTaxable = 0;
    let sumTax = 0;
    let totalItems = 0;

    for (const l of lines) {
      if (l.returnQty > 0) {
        sumTaxable += l.taxable;
        sumTax += l.taxAmount;
        totalItems++;
      }
    }

    const grandTotal = Number((sumTaxable + sumTax).toFixed(2));
    return {
      taxableAmount: Number(sumTaxable.toFixed(2)),
      taxAmount: Number(sumTax.toFixed(2)),
      grandTotal,
      activeItemsCount: totalItems,
    };
  }, [lines]);

  // Validate before showing confirmation modal
  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPurchaseId) {
      setFormError(
        lang === "gu"
          ? "કૃપા કરીને મૂળ ખરીદી બિલ પસંદ કરો."
          : "Please select an original purchase invoice.",
      );
      return;
    }

    const itemsToReturn = lines.filter((l) => l.returnQty > 0);
    if (itemsToReturn.length === 0) {
      setFormError(
        lang === "gu"
          ? "ઓછામાં ઓછી એક વસ્તુ માટે પરત જથ્થો દાખલ કરો."
          : "Please enter return quantity for at least one item.",
      );
      return;
    }

    for (const item of itemsToReturn) {
      if (item.returnQty > item.returnableQty) {
        setFormError(
          lang === "gu"
            ? `${item.itemName} નો જથ્થો ઉપલબ્ધ જથ્થા કરતા વધારે છે.`
            : `Quantity for ${item.itemName} exceeds available returnable balance.`,
        );
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // Execute Final POST API Call
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        returnDate,
        reason: returnReason.trim() || undefined,
        reasonGujarati: returnReasonGujarati.trim() || undefined,
        items: lines
          .filter((l) => l.returnQty > 0)
          .map((l) => ({
            purchaseItemId: l.purchaseItemId,
            quantity: l.returnQty,
          })),
      };

      await apiClient.post(`/purchases/${selectedPurchaseId}/returns`, payload);

      setShowConfirmModal(false);
      setIsCreateModalOpen(false);
      resetForm();
      await fetchReturns();
    } catch (err: any) {
      setFormError(err.message || "Failed to post purchase return.");
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedPartyId("");
    setSelectedPurchaseId("");
    setSelectedPurchase(null);
    setLines([]);
    setReturnReason("");
    setReturnReasonGujarati("");
    setReturnDate(new Date().toISOString().split("T")[0]);
    setFormError(null);
  };

  // Metrics for StatCards
  const metrics = useMemo(() => {
    const totalCount = returns.length;
    const totalTaxable = returns.reduce(
      (sum, r) => sum + Number(r.taxableAmount || 0),
      0,
    );
    const totalGST = returns.reduce(
      (sum, r) =>
        sum +
        Number(r.cgstAmount || 0) +
        Number(r.sgstAmount || 0) +
        Number(r.igstAmount || 0),
      0,
    );
    const totalDebitNote = returns.reduce(
      (sum, r) => sum + Number(r.grandTotal || 0),
      0,
    );
    return { totalCount, totalTaxable, totalGST, totalDebitNote };
  }, [returns]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {lang === "gu"
                ? "ડેબિટ નોટ / ખરીદી પરત રજિસ્ટર"
                : "Debit Notes & Purchase Returns"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-1 ml-4.5">
            {lang === "gu"
              ? "સપ્લાયરને માલ પરત કરો, ઇન્વેન્ટરી આઉટવર્ડ કપાત કરો અને ડેબિટ નોટ વાઉચર બનાવો."
              : "Record goods returned to suppliers, deduct inventory, and issue double-entry Debit Notes."}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white font-bold text-xs sm:text-sm rounded-xl shadow-card hover:shadow-hover transition-all gap-2"
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
          {lang === "gu" ? "નવી ડેબિટ નોટ બનાવો" : "+ Create Debit Note / Return"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Returns"
          titleGujarati="કુલ પરત"
          value={metrics.totalCount}
          subtext={
            lang === "gu" ? "કુલ નોંધાયેલ ડેબિટ નોટ" : "Registered debit notes"
          }
          variant="brand"
        />
        <StatCard
          title="Taxable Value Returned"
          titleGujarati="કુલ કરપાત્ર મૂલ્ય"
          value={`₹${metrics.totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext={lang === "gu" ? "મૂળ ખરીદી કપાત" : "Net purchase reversal"}
          variant="default"
        />
        <StatCard
          title="Total ITC Reversal"
          titleGujarati="કુલ આઇટીસી રિવર્સલ"
          value={`₹${metrics.totalGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext={lang === "gu" ? "ઇનપુટ ટેક્સ રિવર્સલ" : "Reversed input GST"}
          variant="warning"
        />
        <StatCard
          title="Total Debit Note Value"
          titleGujarati="કુલ ડેબિટ નોટ રકમ"
          value={`₹${metrics.totalDebitNote.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext={
            lang === "gu" ? "સપ્લાયર લેણું કપાત" : "Total creditor reduction"
          }
          variant="danger"
        />
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => fetchReturns()}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            {lang === "gu" ? "ફરી પ્રયાસ કરો (Retry)" : "Retry"}
          </button>
        </div>
      )}

      {/* Main DataTable Register */}
      <DataTable<PurchaseReturn>
        data={returns}
        columns={[
          {
            header: lang === "gu" ? "ડેબિટ નોટ નં" : "Debit Note #",
            accessorKey: "returnNumber",
            sortable: true,
            cell: (ret) => (
              <span className="font-semibold text-indigo-700">
                {ret.returnNumber}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "તારીખ" : "Date",
            accessorKey: "returnDate",
            sortable: true,
            cell: (ret) => (
              <span className="text-slate-600 text-xs">
                {new Date(ret.returnDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "સપ્લાયર (પાર્ટી)" : "Supplier Party",
            accessorKey: "partyId",
            cell: (ret) => (
              <div>
                <div className="font-medium text-slate-800">
                  {lang === "gu" && ret.party?.nameGujarati
                    ? ret.party.nameGujarati
                    : ret.party?.name}
                </div>
                {ret.party?.gstin && (
                  <div className="text-xs text-slate-400 font-mono">
                    {ret.party.gstin}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: lang === "gu" ? "મૂળ ખરીદી બિલ" : "Original Bill #",
            accessorKey: "purchaseInvoiceId",
            cell: (ret) => (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono font-medium border border-slate-200">
                {ret.purchaseInvoice?.vendorInvoiceNumber || "—"}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "આઈટમ્સ" : "Items",
            accessorKey: "id",
            className: "text-center",
            cell: (ret) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {ret.items?.length || 0}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "કરપાત્ર કિંમત" : "Taxable",
            accessorKey: "taxableAmount",
            sortable: true,
            className: "text-right text-slate-700",
            cell: (ret) => (
              <span>
                ₹
                {Number(ret.taxableAmount).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "જીએસટી રિવર્સલ" : "Tax Reversal",
            accessorKey: "cgstAmount",
            sortable: true,
            className: "text-right text-amber-700 font-medium",
            cell: (ret) => {
              const totalTax =
                Number(ret.cgstAmount || 0) +
                Number(ret.sgstAmount || 0) +
                Number(ret.igstAmount || 0);
              return (
                <span>
                  ₹
                  {totalTax.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              );
            },
          },
          {
            header: lang === "gu" ? "કુલ રકમ" : "Total Amount",
            accessorKey: "grandTotal",
            sortable: true,
            className: "text-right font-bold text-slate-900",
            cell: (ret) => (
              <span>
                ₹
                {Number(ret.grandTotal).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "ક્રિયા" : "Action",
            className: "text-center",
            cell: (ret) => (
              <button
                onClick={() => {
                  setSelectedReturnDetails(ret);
                  setIsDetailsModalOpen(true);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-[#F47721] hover:text-[#D95F12] bg-[#FFF3E8] hover:bg-[#F47721] hover:text-white rounded-md transition-colors"
              >
                {lang === "gu" ? "વિગતો જુઓ" : "View Details"}
              </button>
            ),
          },
        ]}
        keyExtractor={(ret) => ret.id}
        searchPlaceholder={
          lang === "gu"
            ? "ડેબિટ નોટ નં, સપ્લાયર કે મૂળ બિલ નં થી શોધો..."
            : "Search return #, supplier or bill #..."
        }
        searchKeys={["returnNumber"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ ડેબિટ નોટ મળી નથી. સપ્લાયરને ખામીયુક્ત માલ પરત કરવા નવી ડેબિટ નોટ બનાવો."
            : "No purchase returns recorded. Issue your first debit note when returning goods."
        }
        exportFilename="purchase_returns_debit_notes"
        themeColor="saffron"
        toolbarChildren={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPartyFilter}
              onChange={(e) => setSelectedPartyFilter(e.target.value)}
              className="border border-border rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">
                {lang === "gu" ? "બધા સપ્લાયર્સ" : "All Suppliers"}
              </option>
              {partiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === "gu" && p.nameGujarati ? p.nameGujarati : p.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-border rounded-xl px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50"
                title="Start Date"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-border rounded-xl px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50"
                title="End Date"
              />
            </div>

            {(selectedPartyFilter || startDate || endDate) && (
              <button
                onClick={() => {
                  setSelectedPartyFilter("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline ml-1"
              >
                {lang === "gu" ? "ફિલ્ટર્સ સાફ કરો" : "Reset Filters"}
              </button>
            )}
          </div>
        }
        mobileCardRender={(ret) => {
          const totalTax =
            Number(ret.cgstAmount || 0) +
            Number(ret.sgstAmount || 0) +
            Number(ret.igstAmount || 0);

          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-700">
                  {ret.returnNumber}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(ret.returnDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="text-xs font-medium text-slate-800">
                {lang === "gu" && ret.party?.nameGujarati
                  ? ret.party.nameGujarati
                  : ret.party?.name}
              </div>
              {ret.purchaseInvoice?.vendorInvoiceNumber && (
                <div className="text-xs text-slate-500 font-mono">
                  Bill: {ret.purchaseInvoice.vendorInvoiceNumber}
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <span className="text-slate-500">Tax Rev: ₹{totalTax.toFixed(2)}</span>
                <span className="font-mono font-bold text-slate-900">
                  Total: ₹
                  {Number(ret.grandTotal).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={() => {
                    setSelectedReturnDetails(ret);
                    setIsDetailsModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-[#F47721] bg-[#FFF3E8] rounded-md"
                >
                  {lang === "gu" ? "વિગતો જુઓ" : "View Details"}
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* CREATE RETURN MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Debit Note / Purchase Return"
        titleGujarati="નવી ડેબિટ નોટ / ખરીદી પરત બનાવો"
        maxWidth="4xl"
      >
        <form onSubmit={handleInitiateSubmit} className="space-y-6">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-start gap-2">
              <svg
                className="w-5 h-5 text-rose-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          {/* Supplier & Bill Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "સપ્લાયર પસંદ કરો *" : "Select Supplier *"}
              </label>
              <select
                required
                value={selectedPartyId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">
                  {lang === "gu"
                    ? "-- સપ્લાયર પસંદ કરો --"
                    : "-- Choose Supplier --"}
                </option>
                {partiesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === "gu" && p.nameGujarati ? p.nameGujarati : p.name}{" "}
                    {p.gstin ? `(${p.gstin})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu"
                  ? "મૂળ ખરીદી બિલ પસંદ કરો *"
                  : "Original Purchase Invoice *"}
              </label>
              <select
                required
                disabled={!selectedPartyId || isLoadingBills}
                value={selectedPurchaseId}
                onChange={(e) => handlePurchaseSelect(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                <option value="">
                  {isLoadingBills
                    ? lang === "gu"
                      ? "બિલો લોડ થઈ રહ્યા છે..."
                      : "Loading bills..."
                    : supplierBills.length === 0 && selectedPartyId
                      ? lang === "gu"
                        ? "આ સપ્લાયર માટે કોઈ બિલ નથી"
                        : "No purchase bills for this supplier"
                      : lang === "gu"
                        ? "-- મૂળ બિલ પસંદ કરો --"
                        : "-- Choose Original Bill --"}
                </option>
                {supplierBills.map((b) => (
                  <option key={b.id} value={b.id}>
                    Invoice #{b.vendorInvoiceNumber} — ₹
                    {Number(b.grandTotal).toLocaleString("en-IN")} (
                    {new Date(b.invoiceDate).toLocaleDateString("en-IN")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Summary Banner */}
          {selectedPurchase && (
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-wrap gap-4 justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">
                  {lang === "gu" ? "મૂળ બિલ રકમ:" : "Original Bill Amount:"}
                </span>{" "}
                <span className="font-bold text-slate-800">
                  ₹{Number(selectedPurchase.grandTotal).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-slate-500">
                  {lang === "gu" ? "બાકી લેણું:" : "Current Outstanding:"}
                </span>{" "}
                <span className="font-bold text-slate-800">
                  ₹
                  {Number(selectedPurchase.balanceAmount).toLocaleString(
                    "en-IN",
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500">
                  {lang === "gu" ? "સપ્લાયનું સ્થળ:" : "Place of Supply:"}
                </span>{" "}
                <span className="font-medium text-slate-700">
                  State Code {selectedPurchase.placeOfSupply}
                </span>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          {isLoadingPurchase ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-[#F47721] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              {lang === "gu"
                ? "આઈટમ્સ લોડ થઈ રહી છે..."
                : "Loading bill items..."}
            </div>
          ) : lines.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                {lang === "gu"
                  ? "પરત કરવા માટે આઈટમ્સ અને જથ્થો દાખલ કરો *"
                  : "Items and Quantities to Return *"}
              </label>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">
                        {lang === "gu" ? "આઈટમ" : "Item"}
                      </th>
                      <th className="py-2.5 px-3 text-center">
                        {lang === "gu" ? "મૂળ જથ્થો" : "Original Qty"}
                      </th>
                      <th className="py-2.5 px-3 text-center">
                        {lang === "gu" ? "પહેલાં પરત કરેલ" : "Already Returned"}
                      </th>
                      <th className="py-2.5 px-3 text-center text-emerald-700">
                        {lang === "gu" ? "બાકી ઉપલબ્ધ" : "Available"}
                      </th>
                      <th className="py-2.5 px-3 w-32">
                        {lang === "gu" ? "પરત જથ્થો" : "Return Qty"}
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        {lang === "gu" ? "ભાવ" : "Rate"}
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        {lang === "gu" ? "જીએસટી" : "GST %"}
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        {lang === "gu" ? "ડેબિટ મૂલ્ય" : "Debit Amount"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((l, idx) => (
                      <tr
                        key={l.purchaseItemId}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {lang === "gu" && l.itemNameGujarati
                            ? l.itemNameGujarati
                            : l.itemName}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {l.originalQty}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {l.previouslyReturnedQty}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                          {l.returnableQty}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max={l.returnableQty}
                            step="any"
                            disabled={l.returnableQty === 0}
                            value={l.returnQty || ""}
                            placeholder="0"
                            onChange={(e) =>
                              handleQtyChange(idx, e.target.value)
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-right font-semibold focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          ₹{l.unitPrice}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {l.taxRate}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹
                          {l.total.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Return Date & Reasons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu" ? "પરત તારીખ *" : "Return Date *"}
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu"
                  ? "પરત કરવાનું કારણ (અંગ્રેજી)"
                  : "Reason (English)"}
              </label>
              <input
                type="text"
                placeholder="e.g. Defective items / transport damage"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {lang === "gu"
                  ? "પરત કરવાનું કારણ (ગુજરાતી)"
                  : "Reason (Gujarati)"}
              </label>
              <input
                type="text"
                placeholder="દા.ત. ખામીયુક્ત માલ / તૂટી ગયેલ"
                value={returnReasonGujarati}
                onChange={(e) => setReturnReasonGujarati(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Read-only Live Calculations Footer Banner */}
          {summary.activeItemsCount > 0 && (
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap justify-between items-center text-sm shadow-md">
              <div className="flex gap-6">
                <div>
                  <div className="text-xs text-slate-400">
                    {lang === "gu" ? "કરપાત્ર કિંમત" : "Taxable Value"}
                  </div>
                  <div className="font-semibold text-slate-200">
                    ₹
                    {summary.taxableAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">
                    {lang === "gu" ? "જીએસટી રિવર્સલ" : "Tax Reversal"}
                  </div>
                  <div className="font-semibold text-amber-300">
                    ₹
                    {summary.taxAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">
                  {lang === "gu"
                    ? "કુલ ડેબિટ નોટ મૂલ્ય"
                    : "Total Debit Note Amount"}
                </div>
                <div className="text-xl font-bold text-emerald-400">
                  ₹
                  {summary.grandTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={summary.activeItemsCount === 0 || isSubmitting}
              className="px-5 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {lang === "gu"
                ? "ડેબિટ નોટ પુષ્ટિ કરો"
                : "Review & Post Debit Note"}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION BEFORE POSTING MODAL */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Debit Note Posting"
        titleGujarati="ડેબિટ નોટ પોસ્ટિંગની પુષ્ટિ કરો"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {lang === "gu"
              ? "આ ડેબિટ નોટ સેવ થવાથી આપોઆપ:"
              : "Posting this Debit Note will immediately and atomically:"}
          </p>
          <ul className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#F47721] rounded-full"></span>
              {lang === "gu"
                ? "ઇન્વેન્ટરી સ્ટોક-આઉટ કપાત થશે (Stock Ledger Outward)"
                : "Deduct physical inventory in the stock ledger (Stock-out)."}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#F47721] rounded-full"></span>
              {lang === "gu"
                ? "જનરલ લેજરમાં ડેબિટ નોટ વાઉચર (Dr સપ્લાયર, Cr ખરીદી & જીએસટી) જમા થશે"
                : "Post balanced Debit Note voucher (Dr Supplier, Cr Purchases & GST)."}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#F47721] rounded-full"></span>
              {lang === "gu"
                ? `સપ્લાયર ખાતાનું બાકી લેણું ₹${summary.grandTotal} થી ઘટશે`
                : `Reduce supplier outstanding payable by ₹${summary.grandTotal}.`}
            </li>
          </ul>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            {lang === "gu"
              ? "નોંધ: પોસ્ટ કરેલા વાઉચર્સ અને કાયદેસર ઓડિટ ટ્રેઇલ ફેરફાર માટે અપરિવર્તનશીલ (Immutable) રહેશે."
              : "Note: Posted vouchers and audit logs are immutable. Please verify all line quantities."}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              {lang === "gu" ? "પાછા જાઓ" : "Go Back"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmSubmit}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {lang === "gu" ? "હા, પોસ્ટ કરો" : "Yes, Post Debit Note"}
            </button>
          </div>
        </div>
      </Modal>

      {/* DETAILS MODAL */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={
          selectedReturnDetails
            ? `Debit Note Details — ${selectedReturnDetails.returnNumber}`
            : "Return Details"
        }
        titleGujarati="ડેબિટ નોટ સંપૂર્ણ વિગતો"
        maxWidth="2xl"
      >
        {selectedReturnDetails && (
          <div className="space-y-6 text-sm">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">
                  {lang === "gu" ? "ડેબિટ નોટ નં:" : "Debit Note #:"}
                </span>
                <span className="font-bold text-indigo-700 text-sm">
                  {selectedReturnDetails.returnNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">
                  {lang === "gu" ? "તારીખ:" : "Date:"}
                </span>
                <span className="font-semibold text-slate-800">
                  {new Date(
                    selectedReturnDetails.returnDate,
                  ).toLocaleDateString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">
                  {lang === "gu" ? "મૂળ ખરીદી બિલ:" : "Original Bill #:"}
                </span>
                <span className="font-mono font-medium text-slate-800">
                  {selectedReturnDetails.purchaseInvoice?.vendorInvoiceNumber}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">
                  {lang === "gu" ? "સપ્લાયર:" : "Supplier:"}
                </span>
                <span className="font-semibold text-slate-900">
                  {lang === "gu" && selectedReturnDetails.party?.nameGujarati
                    ? selectedReturnDetails.party.nameGujarati
                    : selectedReturnDetails.party?.name}
                </span>
                {selectedReturnDetails.party?.gstin && (
                  <span className="text-slate-400 block font-mono text-xs">
                    GSTIN: {selectedReturnDetails.party.gstin}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">
                  {lang === "gu" ? "કારણ:" : "Reason:"}
                </span>
                <span className="text-slate-700">
                  {selectedReturnDetails.reason ||
                    selectedReturnDetails.reasonGujarati ||
                    "—"}
                </span>
              </div>
            </div>

            {/* Returned Items */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase mb-2">
                {lang === "gu" ? "પરત કરેલ આઈટમ્સ" : "Returned Items Breakdown"}
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-right">GST %</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReturnDetails.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {lang === "gu" && item.item?.nameGujarati
                            ? item.item.nameGujarati
                            : item.item?.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-indigo-700">
                          {Number(item.quantity)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          ₹{Number(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          ₹
                          {Number(item.taxableAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {Number(item.taxRate)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹
                          {Number(item.totalAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tax & Total Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount (કરપાત્ર મૂલ્ય):</span>
                <span className="font-semibold text-slate-800">
                  ₹
                  {Number(selectedReturnDetails.taxableAmount).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2 },
                  )}
                </span>
              </div>
              {Number(selectedReturnDetails.cgstAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Input CGST Reversal (કેન્દ્રીય જીએસટી રિવર્સલ):</span>
                  <span className="font-semibold text-amber-700">
                    ₹
                    {Number(selectedReturnDetails.cgstAmount).toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2 },
                    )}
                  </span>
                </div>
              )}
              {Number(selectedReturnDetails.sgstAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Input SGST Reversal (રાજ્ય જીએસટી રિવર્સલ):</span>
                  <span className="font-semibold text-amber-700">
                    ₹
                    {Number(selectedReturnDetails.sgstAmount).toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2 },
                    )}
                  </span>
                </div>
              )}
              {Number(selectedReturnDetails.igstAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Input IGST Reversal (આંતરરાજ્ય જીએસટી રિવર્સલ):</span>
                  <span className="font-semibold text-amber-700">
                    ₹
                    {Number(selectedReturnDetails.igstAmount).toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2 },
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Debit Note Value (કુલ ડેબિટ નોટ રકમ):</span>
                <span className="text-indigo-700">
                  ₹
                  {Number(selectedReturnDetails.grandTotal).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2 },
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
              >
                {lang === "gu" ? "બંધ કરો" : "Close"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
