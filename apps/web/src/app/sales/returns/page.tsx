"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { Modal } from "../../../components/ui/modal";
import { StatCard } from "../../../components/ui/stat-card";
import { DataTable, ColumnDef } from "../../../components/ui/data-table";

interface ReturnItem {
  id: string;
  salesItemId: string;
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
    sku?: string;
  };
}

interface SalesReturn {
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
  status: string;
  party: {
    id: string;
    name: string;
    nameGujarati?: string;
    gstin?: string;
    phone?: string;
  };
  salesInvoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: number;
    status: string;
  };
  items: ReturnItem[];
}

interface SalesInvoiceDetails {
  id: string;
  invoiceNumber: string;
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
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    item?: {
      id: string;
      name: string;
      nameGujarati?: string;
      sku?: string;
    };
  }>;
  returns?: Array<{
    items: Array<{
      salesItemId: string;
      quantity: number;
    }>;
  }>;
}

interface ReturnLineForm {
  salesItemId: string;
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
  disposition: "RETURN_TO_STOCK" | "DAMAGED" | "SCRAPPED";
}

function SalesReturnsContent() {
  const { lang, currentCompany } = useAuth();
  const searchParams = useSearchParams();
  const queryInvoiceId = searchParams.get("invoiceId");

  const [returns, setReturns] = useState<SalesReturn[]>([]);
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
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<SalesInvoiceDetails | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Form Fields
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [returnReason, setReturnReason] = useState("");
  const [returnReasonGujarati, setReturnReasonGujarati] = useState("");
  const [restoreStock, setRestoreStock] = useState(true);
  const [lines, setLines] = useState<ReturnLineForm[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details Modal State
  const [selectedReturnDetails, setSelectedReturnDetails] =
    useState<SalesReturn | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Print Modal State
  const [printReturn, setPrintReturn] = useState<SalesReturn | null>(null);

  // 1. Fetch Sales Returns List
  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/sales-returns", {
        search: searchTerm || undefined,
        partyId: selectedPartyFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
            ? res
            : [];
      setReturns(list);
    } catch (err: any) {
      setError(err.message || "Failed to load sales returns.");
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
          list.filter((p: any) => p.type === "CUSTOMER" || !p.type),
        );
      })
      .catch(() => {});
  }, []);

  // When customer is selected in Create modal, fetch their posted sales invoices
  const handleCustomerChange = async (partyId: string) => {
    setSelectedPartyId(partyId);
    setSelectedInvoiceId("");
    setSelectedInvoice(null);
    setLines([]);
    setFormError(null);
    if (!partyId) {
      setCustomerInvoices([]);
      return;
    }

    setIsLoadingInvoices(true);
    try {
      const res: any = await apiClient.get("/invoices/sales", {
        partyId,
        status: "ISSUED",
        limit: 100,
      });
      const invs = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
      setCustomerInvoices(invs);
    } catch (err: any) {
      setFormError(err.message || "Failed to load customer invoices.");
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Load specific sales invoice details and previous returns
  const loadInvoiceDetails = useCallback(async (invoiceId: string) => {
    setIsLoadingInvoice(true);
    setFormError(null);
    try {
      const [inv, returnsList]: [any, any] = await Promise.all([
        apiClient.get(`/invoices/sales/${invoiceId}`),
        apiClient
          .get(`/sales-returns`, { salesInvoiceId: invoiceId })
          .catch(() => ({ data: [] })),
      ]);

      const priorReturns = Array.isArray(returnsList?.data)
        ? returnsList.data
        : Array.isArray(returnsList)
          ? returnsList
          : [];

      // Calculate previously returned per item
      const returnedMap = new Map<string, number>();
      for (const ret of priorReturns) {
        if (Array.isArray(ret.items)) {
          for (const item of ret.items) {
            const prev = returnedMap.get(item.salesItemId) || 0;
            returnedMap.set(item.salesItemId, prev + Number(item.quantity));
          }
        }
      }

      setSelectedInvoice({
        ...inv,
        returns: priorReturns,
      });

      const partyId = inv.partyId || inv.party?.id;
      if (partyId) {
        setSelectedPartyId(partyId);
        if (inv.party) {
          setPartiesList((prev) => {
            if (prev.some((p) => p.id === partyId)) return prev;
            return [...prev, inv.party];
          });
        }
      }
      setCustomerInvoices([inv]);

      // Populate line forms
      const formLines: ReturnLineForm[] = (inv.items || []).map((itm: any) => {
        const origQty = Number(itm.quantity) || 0;
        const prevReturned = returnedMap.get(itm.id) || 0;
        const returnable = Math.max(0, origQty - prevReturned);
        return {
          salesItemId: itm.id,
          itemId: itm.itemId,
          itemName: itm.item?.name || itm.description || "Item",
          itemNameGujarati: itm.item?.nameGujarati,
          originalQty: origQty,
          previouslyReturnedQty: prevReturned,
          returnableQty: returnable,
          returnQty: 0,
          unitPrice: Number(itm.unitPrice) || 0,
          taxRate: Number(itm.taxRate) || 0,
          taxable: 0,
          taxAmount: 0,
          total: 0,
          disposition: "RETURN_TO_STOCK",
        };
      });

      setLines(formLines);
    } catch (err: any) {
      setFormError(err.message || "Failed to load invoice details.");
    } finally {
      setIsLoadingInvoice(false);
    }
  }, []);

  // Handle invoice change in select
  const handleInvoiceChange = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    if (invoiceId) {
      loadInvoiceDetails(invoiceId);
    } else {
      setSelectedInvoice(null);
      setLines([]);
    }
  };

  // If page opened with ?invoiceId=..., initialize modal directly
  useEffect(() => {
    if (queryInvoiceId) {
      setIsCreateModalOpen(true);
      setSelectedInvoiceId(queryInvoiceId);
      loadInvoiceDetails(queryInvoiceId);
    }
  }, [queryInvoiceId, loadInvoiceDetails]);

  // Recalculate line amounts on returnQty change
  const handleQtyChange = (salesItemId: string, value: string) => {
    const rawVal = parseFloat(value);
    const qty = isNaN(rawVal) ? 0 : rawVal;

    setLines((prev) =>
      prev.map((ln) => {
        if (ln.salesItemId !== salesItemId) return ln;

        const clampedQty = Math.max(0, Math.min(qty, ln.returnableQty));
        const taxable = Math.round(clampedQty * ln.unitPrice * 100) / 100;
        const taxAmount =
          Math.round(((taxable * ln.taxRate) / 100) * 100) / 100;
        const total = taxable + taxAmount;

        return {
          ...ln,
          returnQty: clampedQty,
          taxable,
          taxAmount,
          total,
        };
      }),
    );
  };

  // Handle disposition change
  const handleDispositionChange = (
    salesItemId: string,
    disposition: "RETURN_TO_STOCK" | "DAMAGED" | "SCRAPPED",
  ) => {
    setLines((prev) =>
      prev.map((ln) =>
        ln.salesItemId === salesItemId ? { ...ln, disposition } : ln,
      ),
    );
  };

  // Summary Totals for Create Modal
  const summary = useMemo(() => {
    let taxable = 0;
    let taxAmount = 0;
    let total = 0;
    let selectedLinesCount = 0;

    for (const ln of lines) {
      if (ln.returnQty > 0) {
        selectedLinesCount++;
        taxable += ln.taxable;
        taxAmount += ln.taxAmount;
        total += ln.total;
      }
    }

    const isIntra =
      selectedInvoice && currentCompany
        ? selectedInvoice.placeOfSupply === currentCompany.stateCode
        : true;

    const cgst = isIntra ? Math.round((taxAmount / 2) * 100) / 100 : 0;
    const sgst = isIntra ? Math.round((taxAmount - cgst) * 100) / 100 : 0;
    const igst = !isIntra ? taxAmount : 0;

    return {
      taxable: Math.round(taxable * 100) / 100,
      cgst,
      sgst,
      igst,
      totalTax: taxAmount,
      grandTotal: Math.round(total * 100) / 100,
      selectedLinesCount,
    };
  }, [lines, selectedInvoice, currentCompany]);

  // Overall Statistics for Page Header
  const overallStats = useMemo(() => {
    const totalCount = returns.length;
    let totalCredit = 0;
    let totalTaxReversed = 0;

    for (const r of returns) {
      totalCredit += Number(r.grandTotal) || 0;
      totalTaxReversed +=
        (Number(r.cgstAmount) || 0) +
        (Number(r.sgstAmount) || 0) +
        (Number(r.igstAmount) || 0);
    }

    return {
      totalCount,
      totalCredit: Math.round(totalCredit * 100) / 100,
      totalTaxReversed: Math.round(totalTaxReversed * 100) / 100,
    };
  }, [returns]);

  // Submit Credit Note / Sales Return
  const handleSubmitReturn = async () => {
    setFormError(null);

    if (!selectedInvoiceId) {
      setFormError(
        lang === "gu"
          ? "કૃપા કરીને વેચાણ બિલ પસંદ કરો."
          : "Please select an original sales invoice.",
      );
      return;
    }

    const returnItems = lines
      .filter((ln) => ln.returnQty > 0)
      .map((ln) => ({
        salesItemId: ln.salesItemId,
        quantity: ln.returnQty,
        disposition: ln.disposition,
      }));

    if (returnItems.length === 0) {
      setFormError(
        lang === "gu"
          ? "ઓછામાં ઓછી એક વસ્તુ માટે પરત જથ્થો દાખલ કરો."
          : "Please enter return quantity greater than 0 for at least one item.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/sales-returns", {
        salesInvoiceId: selectedInvoiceId,
        returnDate,
        reason: returnReason || "Sales return by customer",
        reasonGujarati: returnReasonGujarati || "ગ્રાહક દ્વારા માલ પરત મળ્યો",
        restoreStock,
        items: returnItems,
      });

      setIsCreateModalOpen(false);
      setSelectedPartyId("");
      setSelectedInvoiceId("");
      setSelectedInvoice(null);
      setLines([]);
      setReturnReason("");
      setReturnReasonGujarati("");
      await fetchReturns();
    } catch (err: any) {
      setFormError(
        err.message ||
          (lang === "gu"
            ? "ક્રેડિટ નોટ બનાવવામાં નિષ્ફળતા મળી."
            : "Failed to create sales return / credit note."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">
              {lang === "gu"
                ? "ક્રેડિટ નોટ / વેચાણ પરત"
                : "Sales Returns & Credit Notes"}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-saffron-light text-primary border border-primary/25">
              GST Compliant
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            {lang === "gu"
              ? "વેચાણ બિલ સામે માલ પરત સ્વીકારો, જીએસટી રિવર્સલ કરો અને ગ્રાહકને ક્રેડિટ નોટ આપો."
              : "Issue credit notes against posted sales invoices, reverse output GST, and restore stock."}
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-pressed text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-card hover:shadow-hover"
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
            {lang === "gu" ? "નવી ક્રેડિટ નોટ બનાવો" : "+ Create Credit Note"}
          </span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Credit Notes"
          titleGujarati="કુલ ક્રેડિટ નોટ્સ"
          value={overallStats.totalCount}
          subtext="Issued sales returns"
          variant="brand"
        />
        <StatCard
          title="Total Credit Value"
          titleGujarati="કુલ ક્રેડિટ રકમ"
          value={`₹${overallStats.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Customer credit allocated"
          variant="success"
        />
        <StatCard
          title="Output GST Reversed"
          titleGujarati="રિવર્સ થયેલ જીએસટી"
          value={`₹${overallStats.totalTaxReversed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="CGST + SGST + IGST reversal"
          variant="warning"
        />
      </div>

      {/* Main DataTable */}
      <DataTable<SalesReturn>
        data={returns}
        columns={[
          {
            header: lang === "gu" ? "ક્રેડિટ નોટ નં" : "Credit Note #",
            accessorKey: "returnNumber",
            sortable: true,
            cell: (ret) => (
              <span className="font-semibold text-blue-600">
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
                {new Date(ret.returnDate).toLocaleDateString("en-IN")}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "ગ્રાહક" : "Customer",
            accessorKey: "partyId",
            cell: (ret) => (
              <div>
                <div className="font-medium text-slate-800">
                  {ret.party?.name}
                </div>
                {ret.party?.gstin && (
                  <div className="text-xs text-slate-400 font-mono">
                    GSTIN: {ret.party.gstin}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: lang === "gu" ? "મૂળ બિલ નં" : "Original Invoice",
            accessorKey: "salesInvoiceId",
            cell: (ret) => (
              <span className="text-slate-700 font-mono text-xs">
                {ret.salesInvoice?.invoiceNumber || "-"}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "કરપાત્ર રકમ" : "Taxable Amt",
            accessorKey: "taxableAmount",
            sortable: true,
            className: "text-right font-medium text-slate-700",
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
            header: lang === "gu" ? "જીએસટી" : "GST Total",
            accessorKey: "cgstAmount",
            sortable: true,
            className: "text-right font-medium text-slate-700",
            cell: (ret) => {
              const gstTotal =
                (Number(ret.cgstAmount) || 0) +
                (Number(ret.sgstAmount) || 0) +
                (Number(ret.igstAmount) || 0);
              return (
                <span>
                  ₹
                  {gstTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              );
            },
          },
          {
            header: lang === "gu" ? "કુલ ક્રેડિટ" : "Total Credit",
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
            header: lang === "gu" ? "સ્થિતિ" : "Status",
            accessorKey: "status",
            sortable: true,
            className: "text-center",
            cell: (ret) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                {ret.status || "ISSUED"}
              </span>
            ),
          },
          {
            header: lang === "gu" ? "ક્રિયાઓ" : "Actions",
            className: "text-center",
            cell: (ret) => (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setSelectedReturnDetails(ret);
                    setIsDetailsModalOpen(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title={lang === "gu" ? "વિગતો જુઓ" : "View Details"}
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
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setPrintReturn(ret)}
                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  title={
                    lang === "gu"
                      ? "પ્રિન્ટ ક્રેડિટ નોટ"
                      : "Print Credit Note"
                  }
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
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                </button>
              </div>
            ),
          },
        ]}
        keyExtractor={(ret) => ret.id}
        searchPlaceholder={
          lang === "gu"
            ? "ક્રેડિટ નોટ નં, બિલ નં અથવા ગ્રાહક શોધો..."
            : "Search Credit Note #, Invoice # or customer..."
        }
        searchKeys={["returnNumber"]}
        defaultPageSize={10}
        isLoading={isLoading}
        emptyMessage={
          lang === "gu"
            ? "કોઈ ક્રેડિટ નોટ્સ મળી નથી. નવી ક્રેડિટ નોટ બનાવવા માટે ઉપરના બટન પર ક્લિક કરો."
            : "No Sales Returns Found. Create a credit note against an eligible sales invoice."
        }
        exportFilename="sales_returns_credit_notes"
        themeColor="saffron"
        toolbarChildren={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPartyFilter}
              onChange={(e) => setSelectedPartyFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-700 font-semibold"
            >
              <option value="">
                {lang === "gu" ? "તમામ ગ્રાહકો" : "All Customers"}
              </option>
              {partiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.gstin ? `(${p.gstin})` : ""}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 text-slate-700"
                title="Start Date"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 text-slate-700"
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
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
              >
                {lang === "gu" ? "ફિલ્ટર દૂર કરો" : "Clear Filters"}
              </button>
            )}
          </div>
        }
        mobileCardRender={(ret) => {
          const gstTotal =
            (Number(ret.cgstAmount) || 0) +
            (Number(ret.sgstAmount) || 0) +
            (Number(ret.igstAmount) || 0);

          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-600">
                  {ret.returnNumber}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                  {ret.status || "ISSUED"}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(ret.returnDate).toLocaleDateString("en-IN")}
                {ret.salesInvoice?.invoiceNumber && (
                  <span className="ml-2 font-mono">
                    Inv: {ret.salesInvoice.invoiceNumber}
                  </span>
                )}
              </div>
              <div className="text-xs font-medium text-slate-800">
                {ret.party?.name}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Tax: ₹{gstTotal.toFixed(2)}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  Total: ₹
                  {Number(ret.grandTotal).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => {
                    setSelectedReturnDetails(ret);
                    setIsDetailsModalOpen(true);
                  }}
                  className="text-xs text-blue-600 font-semibold"
                >
                  View Details
                </button>
                <button
                  onClick={() => setPrintReturn(ret)}
                  className="text-xs text-emerald-600 font-semibold"
                >
                  Print
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* CREATE CREDIT NOTE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          lang === "gu"
            ? "નવી ક્રેડિટ નોટ / વેચાણ પરત બનાવો"
            : "Create Sales Return / Credit Note"
        }
        titleGujarati="ગ્રાહક વેચાણ પરત"
        maxWidth="4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500">
              {summary.selectedLinesCount > 0 ? (
                <span>
                  {summary.selectedLinesCount} items selected | Total Credit:{" "}
                  <strong className="text-slate-800">
                    ₹{summary.grandTotal.toFixed(2)}
                  </strong>
                </span>
              ) : (
                <span>Select return quantities above</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isSubmitting || summary.selectedLinesCount === 0}
                onClick={handleSubmitReturn}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm inline-flex items-center gap-1.5"
              >
                {isSubmitting && (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                <span>
                  {lang === "gu"
                    ? "ક્રેડિટ નોટ ઇશ્યુ કરો"
                    : "Issue Credit Note"}
                </span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 p-1">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0 text-rose-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          {/* Selection Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === "gu" ? "૧. ગ્રાહક (Customer)" : "1. Select Customer"}
                </label>
                {queryInvoiceId && (
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-semibold flex items-center gap-1">
                    🔒 {lang === "gu" ? "પૂર્વ-પસંદિત (લોક)" : "Locked"}
                  </span>
                )}
              </div>
              <select
                value={selectedPartyId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                disabled={Boolean(queryInvoiceId)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-800 disabled:font-medium disabled:cursor-not-allowed"
              >
                <option value="">
                  {lang === "gu"
                    ? "-- ગ્રાહક પસંદ કરો --"
                    : "-- Select Customer --"}
                </option>
                {partiesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.gstin ? `(${p.gstin})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === "gu"
                    ? "૨. વેચાણ બિલ (Sales Invoice)"
                    : "2. Select Sales Invoice"}
                </label>
                {queryInvoiceId && (
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-semibold flex items-center gap-1">
                    🔒 {lang === "gu" ? "પૂર્વ-પસંદિત (લોક)" : "Locked"}
                  </span>
                )}
              </div>
              <select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                disabled={
                  Boolean(queryInvoiceId) ||
                  isLoadingInvoices ||
                  (!selectedPartyId && !queryInvoiceId)
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-800 disabled:font-medium disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingInvoices
                    ? "Loading invoices..."
                    : lang === "gu"
                      ? "-- બિલ પસંદ કરો --"
                      : "-- Select Invoice --"}
                </option>
                {customerInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} (₹{Number(inv.grandTotal).toFixed(2)}) -{" "}
                    {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu" ? "પરત તારીખ" : "Return Date"}
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Invoice Summary Banner */}
          {selectedInvoice && (
            <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200/80 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-700">
              <div>
                <span className="font-semibold text-blue-900">
                  Invoice #{selectedInvoice.invoiceNumber}
                </span>{" "}
                | Dated:{" "}
                {new Date(selectedInvoice.invoiceDate).toLocaleDateString(
                  "en-IN",
                )}{" "}
                | Customer: <strong>{selectedInvoice.party?.name}</strong>
              </div>
              <div className="flex gap-4">
                <span>
                  Invoice Total:{" "}
                  <strong>
                    ₹{Number(selectedInvoice.grandTotal).toFixed(2)}
                  </strong>
                </span>
                <span>
                  Unpaid Balance:{" "}
                  <strong>
                    ₹{Number(selectedInvoice.balanceAmount).toFixed(2)}
                  </strong>
                </span>
                <span>
                  State POS: <strong>{selectedInvoice.placeOfSupply}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          {isLoadingInvoice ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-1"></div>
              <p>Loading invoice lines & return history...</p>
            </div>
          ) : lines.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === "gu"
                    ? "પરત વસ્તુઓની વિગત"
                    : "Eligible Invoice Line Items"}
                </h4>
                <span className="text-xs text-slate-500">
                  Enter return quantities below (cannot exceed remaining
                  returnable quantity).
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-2 text-right">Invoiced Qty</th>
                      <th className="py-2.5 px-2 text-right">Already Ret.</th>
                      <th className="py-2.5 px-2 text-right">Returnable</th>
                      <th className="py-2.5 px-3 text-right">Return Qty</th>
                      <th className="py-2.5 px-2 text-right">Unit Rate</th>
                      <th className="py-2.5 px-2 text-right">GST %</th>
                      <th className="py-2.5 px-2 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-3">Disposition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((ln) => {
                      const isFullyReturned = ln.returnableQty <= 0;

                      return (
                        <tr
                          key={ln.salesItemId}
                          className={`hover:bg-slate-50/50 ${
                            isFullyReturned ? "bg-slate-50 opacity-60" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {ln.itemName}
                            {ln.itemNameGujarati && (
                              <div className="text-[11px] text-slate-500">
                                {ln.itemNameGujarati}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-600">
                            {ln.originalQty.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right text-amber-700">
                            {ln.previouslyReturnedQty.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-800">
                            {ln.returnableQty.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={ln.returnableQty}
                              step="any"
                              disabled={isFullyReturned}
                              value={ln.returnQty || ""}
                              onChange={(e) =>
                                handleQtyChange(ln.salesItemId, e.target.value)
                              }
                              placeholder="0"
                              className="w-20 px-2 py-1 text-right text-xs font-semibold border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-600">
                            ₹{ln.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-600">
                            {ln.taxRate}%
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-800">
                            ₹{ln.total.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={ln.disposition}
                              disabled={isFullyReturned || ln.returnQty <= 0}
                              onChange={(e: any) =>
                                handleDispositionChange(
                                  ln.salesItemId,
                                  e.target.value,
                                )
                              }
                              className="px-2 py-1 text-[11px] border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <option value="RETURN_TO_STOCK">
                                Restock Goods
                              </option>
                              <option value="DAMAGED">Damaged Goods</option>
                              <option value="SCRAPPED">Scrapped Goods</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedInvoiceId ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No line items found on this invoice.
            </div>
          ) : null}

          {/* Reason & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu"
                  ? "પરત કરવાનું કારણ (અંગ્રેજી)"
                  : "Return Reason (English)"}
              </label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Defective quality, excess supply"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "gu"
                  ? "પરત કરવાનું કારણ (ગુજરાતી)"
                  : "Return Reason (Gujarati)"}
              </label>
              <input
                type="text"
                value={returnReasonGujarati}
                onChange={(e) => setReturnReasonGujarati(e.target.value)}
                placeholder="દા.ત. ગુણવત્તામાં ખામી, વધારાનો માલ"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Restore stock option */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="restoreStockCheck"
              checked={restoreStock}
              onChange={(e) => setRestoreStock(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label
              htmlFor="restoreStockCheck"
              className="text-xs text-slate-700 font-medium"
            >
              {lang === "gu"
                ? "સ્વીકારેલ માલ ગોડાઉનમાં જમા કરો (Stock Ledger Restoration)"
                : "Restore accepted goods into inventory warehouse (Stock Transaction Type: SALES_RETURN)"}
            </label>
          </div>

          {/* Live Summary Calculation Box */}
          {summary.selectedLinesCount > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <div className="font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-1">
                {lang === "gu"
                  ? "હિસાબી અસર અને રકમ વિગત"
                  : "Credit Note Financial Breakup"}
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount (Reversing Sales):</span>
                <span>₹{summary.taxable.toFixed(2)}</span>
              </div>
              {summary.cgst > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Output CGST Reversal:</span>
                  <span>₹{summary.cgst.toFixed(2)}</span>
                </div>
              )}
              {summary.sgst > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Output SGST Reversal:</span>
                  <span>₹{summary.sgst.toFixed(2)}</span>
                </div>
              )}
              {summary.igst > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Output IGST Reversal:</span>
                  <span>₹{summary.igst.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-1.5">
                <span>
                  Total Credit Note Grand Total (Credited to Customer):
                </span>
                <span className="text-blue-700">
                  ₹{summary.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* DETAILS MODAL */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={lang === "gu" ? "ક્રેડિટ નોટ વિગતો" : "Credit Note Details"}
        titleGujarati={selectedReturnDetails?.returnNumber}
        maxWidth="2xl"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => {
                setPrintReturn(selectedReturnDetails);
                setIsDetailsModalOpen(false);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm inline-flex items-center gap-1.5"
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
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>{lang === "gu" ? "પ્રિન્ટ કરો" : "Print Credit Note"}</span>
            </button>
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              {lang === "gu" ? "બંધ કરો" : "Close"}
            </button>
          </div>
        }
      >
        {selectedReturnDetails && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <p className="text-slate-400">Credit Note #</p>
                <p className="font-bold text-sm text-slate-800">
                  {selectedReturnDetails.returnNumber}
                </p>
                <p className="text-slate-400 mt-2">Return Date</p>
                <p className="font-medium text-slate-700">
                  {new Date(
                    selectedReturnDetails.returnDate,
                  ).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Customer</p>
                <p className="font-bold text-sm text-slate-800">
                  {selectedReturnDetails.party?.name}
                </p>
                <p className="text-slate-400 mt-2">Against Sales Invoice</p>
                <p className="font-medium text-slate-700">
                  {selectedReturnDetails.salesInvoice?.invoiceNumber || "-"}
                </p>
              </div>
            </div>

            {selectedReturnDetails.reason && (
              <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100">
                <span className="font-semibold text-slate-700">Reason: </span>
                <span className="text-slate-600">
                  {selectedReturnDetails.reason}
                </span>
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-700 mb-2">Returned Items</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Taxable</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedReturnDetails.items || []).map((itm) => (
                      <tr key={itm.id}>
                        <td className="p-2 font-medium text-slate-800">
                          {itm.item?.name || "Item"}
                        </td>
                        <td className="p-2 text-right">
                          {Number(itm.quantity).toFixed(2)}
                        </td>
                        <td className="p-2 text-right">
                          ₹{Number(itm.unitPrice).toFixed(2)}
                        </td>
                        <td className="p-2 text-right">
                          ₹{Number(itm.taxableAmount).toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-bold">
                          ₹{Number(itm.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>
                  ₹{Number(selectedReturnDetails.taxableAmount).toFixed(2)}
                </span>
              </div>
              {Number(selectedReturnDetails.cgstAmount) > 0 && (
                <div className="flex justify-between">
                  <span>CGST Reversed:</span>
                  <span>
                    ₹{Number(selectedReturnDetails.cgstAmount).toFixed(2)}
                  </span>
                </div>
              )}
              {Number(selectedReturnDetails.sgstAmount) > 0 && (
                <div className="flex justify-between">
                  <span>SGST Reversed:</span>
                  <span>
                    ₹{Number(selectedReturnDetails.sgstAmount).toFixed(2)}
                  </span>
                </div>
              )}
              {Number(selectedReturnDetails.igstAmount) > 0 && (
                <div className="flex justify-between">
                  <span>IGST Reversed:</span>
                  <span>
                    ₹{Number(selectedReturnDetails.igstAmount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-1 text-slate-900">
                <span>Grand Total:</span>
                <span className="text-blue-700">
                  ₹{Number(selectedReturnDetails.grandTotal).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* PRINT CREDIT NOTE MODAL */}
      <Modal
        isOpen={Boolean(printReturn)}
        onClose={() => setPrintReturn(null)}
        title="Print Credit Note"
        maxWidth="4xl"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => setPrintReturn(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm inline-flex items-center gap-1.5"
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
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>Print / Save as PDF</span>
            </button>
          </div>
        }
      >
        {printReturn && (
          <div className="p-6 bg-white text-slate-800 text-xs font-sans print:p-0 print:m-0">
            {/* Header */}
            <div className="text-center border-b pb-4 mb-4">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                GST Credit Note / Sales Return
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {currentCompany?.legalName || "Company Name"}
              </h2>
              <p className="text-slate-500 text-[11px]">
                GSTIN: {currentCompany?.gstin || "-"} | State:{" "}
                {currentCompany?.stateCode || "-"}
              </p>
            </div>

            {/* Document Info */}
            <div className="grid grid-cols-2 gap-4 border p-3 rounded mb-4">
              <div>
                <p className="font-semibold text-slate-700">
                  Credit Note Details:
                </p>
                <p>
                  Credit Note No:{" "}
                  <strong className="font-mono">
                    {printReturn.returnNumber}
                  </strong>
                </p>
                <p>
                  Date:{" "}
                  <strong>
                    {new Date(printReturn.returnDate).toLocaleDateString(
                      "en-IN",
                    )}
                  </strong>
                </p>
                <p>
                  Against Invoice:{" "}
                  <strong>
                    {printReturn.salesInvoice?.invoiceNumber || "-"}
                  </strong>
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">
                  Billed / Issued To:
                </p>
                <p>
                  Customer: <strong>{printReturn.party?.name}</strong>
                </p>
                <p>
                  GSTIN:{" "}
                  <strong className="font-mono">
                    {printReturn.party?.gstin || "Unregistered"}
                  </strong>
                </p>
                {printReturn.party?.phone && (
                  <p>Phone: {printReturn.party.phone}</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse border text-xs mb-4">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="border p-2 text-left">#</th>
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-right">Return Qty</th>
                  <th className="border p-2 text-right">Rate</th>
                  <th className="border p-2 text-right">Taxable</th>
                  <th className="border p-2 text-right">Tax %</th>
                  <th className="border p-2 text-right">Total Credit</th>
                </tr>
              </thead>
              <tbody>
                {(printReturn.items || []).map((itm, idx) => (
                  <tr key={itm.id} className="border-b">
                    <td className="border p-2">{idx + 1}</td>
                    <td className="border p-2 font-medium">
                      {itm.item?.name || "Item"}
                    </td>
                    <td className="border p-2 text-right">
                      {Number(itm.quantity).toFixed(2)}
                    </td>
                    <td className="border p-2 text-right">
                      ₹{Number(itm.unitPrice).toFixed(2)}
                    </td>
                    <td className="border p-2 text-right">
                      ₹{Number(itm.taxableAmount).toFixed(2)}
                    </td>
                    <td className="border p-2 text-right">
                      {Number(itm.taxRate)}%
                    </td>
                    <td className="border p-2 text-right font-bold">
                      ₹{Number(itm.totalAmount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64 border p-3 rounded space-y-1 bg-slate-50">
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>₹{Number(printReturn.taxableAmount).toFixed(2)}</span>
                </div>
                {Number(printReturn.cgstAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>₹{Number(printReturn.cgstAmount).toFixed(2)}</span>
                  </div>
                )}
                {Number(printReturn.sgstAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>₹{Number(printReturn.sgstAmount).toFixed(2)}</span>
                  </div>
                )}
                {Number(printReturn.igstAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>₹{Number(printReturn.igstAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t pt-1 text-slate-900">
                  <span>Total Credit:</span>
                  <span>₹{Number(printReturn.grandTotal).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="flex justify-between items-end border-t pt-8 mt-12 text-slate-500">
              <div>
                <p className="text-[11px]">
                  This is a computer generated Credit Note.
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">
                  For {currentCompany?.legalName}
                </p>
                <p className="mt-8">Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function SalesReturnsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm">Loading Sales Returns...</p>
        </div>
      }
    >
      <SalesReturnsContent />
    </Suspense>
  );
}
