"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { ScorecardRibbon, ScorecardSegment } from "@/components/design-system/scorecard-ribbon";
import { formatInr } from "@/components/design-system/tokens";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { CustomSelect } from "@/components/ui/dropdown-system";
import { Phone, AlertTriangle, X, ShieldAlert, Copy } from "lucide-react";
import { formatDate } from "@/lib/date-utils";

interface SalesOrderItem {
  id: string;
  itemId?: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalAmount: number;
  item?: { id: string; name: string };
}

interface SalesOrder {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED" | "CONVERTED";
  category: "SALES_ORDER" | "TAX_INVOICE";
  partyId?: string;
  party?: { id: string; name: string; gstin?: string; phone?: string };
  grandTotal: number;
  items?: SalesOrderItem[];
  notes?: string;
  termsAndConditions?: string;
  shippingAddress?: any;
  convertedInvoice?: { id: string; invoiceNumber: string };
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const { tenantContext, hasPermission } = useAuth();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CONVERTED" | "CANCELLED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [convertMenuAnchor, setConvertMenuAnchor] = useState<{
    order: SalesOrder;
    top: number;
    right: number;
  } | null>(null);
  const [convertingTarget, setConvertingTarget] = useState<SalesOrder | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [stockConfirmPrompt, setStockConfirmPrompt] = useState<string | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<SalesOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get("/invoices/sales", {
        category: "SALES_ORDER",
        limit: 500,
      });
      setOrders(extractList<SalesOrder>(res));
    } catch (err: any) {
      setError(err.message || "Failed to load sales orders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchOrders();
    }
  }, [fetchOrders, tenantContext.companyId]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter === "OPEN" && (o.status === "CONVERTED" || o.status === "CANCELLED")) return false;
      if (statusFilter === "CONVERTED" && o.status !== "CONVERTED") return false;
      if (statusFilter === "CANCELLED" && o.status !== "CANCELLED") return false;
      if (!q) return true;
      return (
        o.invoiceNumber?.toLowerCase().includes(q) ||
        o.party?.name?.toLowerCase().includes(q) ||
        o.party?.phone?.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery, statusFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const metrics = useMemo(() => {
    const total = orders.reduce((s, o) => s + Number(o.grandTotal || 0), 0);
    const converted = orders.filter((o) => o.status === "CONVERTED").reduce((s, o) => s + Number(o.grandTotal || 0), 0);
    const open = orders.filter((o) => o.status !== "CONVERTED" && o.status !== "CANCELLED").reduce((s, o) => s + Number(o.grandTotal || 0), 0);
    const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
    return { total, converted, open, cancelled };
  }, [orders]);

  const scorecardSegments: ScorecardSegment[] = [
    {
      id: "ALL",
      label: "Total Sales Orders",
      value: formatInr(metrics.total),
      subtext: `${orders.length} Orders`,
      isActive: statusFilter === "ALL",
      onClick: () => setStatusFilter("ALL"),
    },
    {
      id: "OPEN",
      label: "Open Orders",
      value: formatInr(metrics.open),
      subtext: "Pending Fulfillment",
      isActive: statusFilter === "OPEN",
      onClick: () => setStatusFilter("OPEN"),
    },
    {
      id: "CONVERTED",
      label: "Converted / Billed",
      value: formatInr(metrics.converted),
      subtext: "Invoiced",
      isActive: statusFilter === "CONVERTED",
      onClick: () => setStatusFilter("CONVERTED"),
    },
    {
      id: "CANCELLED",
      label: "Cancelled",
      value: String(metrics.cancelled),
      subtext: "Voided Orders",
      isActive: statusFilter === "CANCELLED",
      onClick: () => setStatusFilter("CANCELLED"),
    },
  ];

  const handleConvertToInvoice = async (allowNegativeStock = false) => {
    if (!convertingTarget) return;
    setIsConverting(true);
    setConversionError(null);
    try {
      const res: any = await apiClient.post(`/sales/invoices/${convertingTarget.id}/convert-to-invoice`, {
        allowNegativeStock,
      });
      setConvertingTarget(null);
      setStockConfirmPrompt(null);
      setToastMessage(`Sales Order ${convertingTarget.invoiceNumber} converted to Tax Invoice.`);
      fetchOrders();
      if (res?.id) {
        router.push(`/sales/invoices/${res.id}`);
      }
    } catch (err: any) {
      const msg = err.message || "Failed to convert sales order.";
      if (msg.toLowerCase().includes("insufficient stock")) {
        setStockConfirmPrompt(msg);
      } else {
        setConversionError(msg);
      }
    } finally {
      setIsConverting(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/sales/invoices/${deletingTarget.id}`);
      setDeletingTarget(null);
      setToastMessage("Sales Order deleted.");
      fetchOrders();
    } catch (err: any) {
      setError(err.message || "Failed to delete sales order.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!hasPermission("quotations", "view")) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">You do not have permission to view Sales Orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-3">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
            SALES &amp; ORDER MANAGEMENT &bull; {filtered.length} ORDERS
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Sales Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sales/orders/create"
            className="h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-[13px] font-semibold shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <span>+ Create Sales Order</span>
          </Link>
        </div>
      </div>

      <ScorecardRibbon segments={scorecardSegments} />

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search order #, customer..."
              className="w-full h-9 pl-3 pr-3 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1677E8]"
            />
          </div>
          <div className="w-44">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val as any);
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "OPEN", label: "Open Orders" },
                { value: "CONVERTED", label: "Converted" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Order Date &amp; Delivery</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Order Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading sales orders...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No sales orders found. Create a Sales Order or convert from a Quotation.
                  </td>
                </tr>
              ) : (
                paginated.map((order) => {
                  const isConverted = order.status === "CONVERTED";
                  const isCancelled = order.status === "CANCELLED";
                  return (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/sales/invoices/${order.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <span>{order.invoiceNumber}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            SO
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{formatDate(order.invoiceDate)}</div>
                        {order.dueDate && (
                          <div className="text-[11px] text-slate-400">Delivery: {formatDate(order.dueDate)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{order.party?.name || "Cash Customer"}</div>
                        {order.party?.phone && (
                          <div className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{order.party.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#0F172A] tabular-nums">
                        {formatInr(Number(order.grandTotal || 0))}
                      </td>
                      <td className="px-4 py-3">
                        {isConverted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Converted
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Open Order
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {!isConverted && !isCancelled && (
                            <button
                              type="button"
                              onClick={(e) => {
                                if (convertMenuAnchor?.order.id === order.id) {
                                  setConvertMenuAnchor(null);
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setConvertMenuAnchor({
                                  order,
                                  top: rect.bottom + 6,
                                  right: window.innerWidth - rect.right,
                                });
                              }}
                              className="px-2.5 py-1 text-[13px] font-medium text-white bg-[#1677E8] hover:bg-[#1268D3] rounded-lg shadow-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Convert</span>
                              <span className="text-[10px] opacity-80">▾</span>
                            </button>
                          )}
                          <Link
                            href={`/sales/invoices/${order.id}`}
                            className="p-1.5 text-[13px] text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg font-medium border border-[#E2E8F0]"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res: any = await apiClient.get(`/sales/invoices/${order.id}`);
                                const fullData = res?.data || res || order;
                                localStorage.setItem("billing_clone_invoice", JSON.stringify(fullData));
                              } catch {
                                localStorage.setItem("billing_clone_invoice", JSON.stringify(order));
                              }
                              router.push("/sales/orders/create");
                            }}
                            className="p-1.5 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg font-medium border border-[#E2E8F0] inline-flex items-center gap-1 cursor-pointer"
                            title="Duplicate Sales Order"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </button>
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => setDeletingTarget(order)}
                              className="p-1.5 text-[13px] text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Delete Sales Order"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Convert Dropdown */}
      {convertMenuAnchor && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setConvertMenuAnchor(null)} />
          <div
            style={{ top: convertMenuAnchor.top, right: convertMenuAnchor.right }}
            className="fixed z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 text-left"
          >
            <button
              type="button"
              onClick={() => {
                const o = convertMenuAnchor.order;
                setConvertMenuAnchor(null);
                localStorage.setItem("billing_clone_invoice", JSON.stringify(o));
                router.push(`/sales/proforma/create?fromQuotation=${o.id}`);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Convert to Proforma Invoice
            </button>
            <button
              type="button"
              onClick={() => {
                const o = convertMenuAnchor.order;
                setConvertMenuAnchor(null);
                router.push(`/sales/delivery-challan/create?fromQuotation=${o.id}`);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Convert to Delivery Challan
            </button>
            <div className="my-0.5 border-t border-slate-100" />
            <button
              type="button"
              onClick={() => {
                const target = convertMenuAnchor.order;
                setConvertMenuAnchor(null);
                setConvertingTarget(target);
                setConversionError(null);
                setStockConfirmPrompt(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-[#1677E8] hover:bg-blue-50 rounded-lg cursor-pointer"
            >
              Convert to Tax Invoice
            </button>
          </div>
        </>
      )}

      {/* Convert to Tax Invoice Modal */}
      <Modal
        isOpen={!!convertingTarget}
        onClose={() => {
          setConvertingTarget(null);
          setConversionError(null);
          setStockConfirmPrompt(null);
        }}
        title={convertingTarget ? `Convert to Tax Invoice - ${convertingTarget.invoiceNumber}` : ""}
      >
        {convertingTarget && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Convert Sales Order &quot;{convertingTarget.invoiceNumber}&quot; into a legal GST Tax Invoice? This will allocate the next sequential invoice number and dispatch stock.
            </p>
            {conversionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {conversionError}
              </div>
            )}
            {stockConfirmPrompt && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Insufficient Stock Alert</span>
                </div>
                <p className="text-xs text-amber-800">{stockConfirmPrompt}</p>
                <button
                  type="button"
                  onClick={() => handleConvertToInvoice(true)}
                  disabled={isConverting}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Allow Negative Stock &amp; Convert
                </button>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertingTarget(null)}
                className="h-9 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              {!stockConfirmPrompt && (
                <button
                  type="button"
                  onClick={() => handleConvertToInvoice(false)}
                  disabled={isConverting}
                  className="h-9 px-4 text-xs font-semibold text-white bg-[#1677E8] hover:bg-[#1268D3] rounded-xl cursor-pointer"
                >
                  {isConverting ? "Converting..." : "Convert to Tax Invoice"}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deletingTarget} onClose={() => setDeletingTarget(null)} title="Delete Sales Order">
        {deletingTarget && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to delete Sales Order &quot;{deletingTarget.invoiceNumber}&quot;?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                className="h-9 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={isDeleting}
                className="h-9 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
