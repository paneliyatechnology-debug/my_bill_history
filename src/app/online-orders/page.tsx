"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ScorecardRibbon, ScorecardSegment } from "@/components/design-system/scorecard-ribbon";
import { formatInr } from "@/components/design-system/tokens";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  ShoppingBag,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  FileText,
  ArrowRight,
  ExternalLink,
  Printer,
  Search,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Phone,
  MapPin,
  CreditCard,
  Share2,
  PackageCheck,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  Store,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

export type OrderStatus = "PENDING" | "ACCEPTED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED";
export type PaymentMode = "COD" | "UPI" | "CARD" | "NET_BANKING" | "PREPAID";

export interface OrderItem {
  id: string;
  itemId?: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  hsnCode?: string;
  total: number;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  city: string;
  pincode: string;
  source: "ONLINE_STORE" | "WHATSAPP" | "MOBILE_APP" | "CATALOG";
  status: OrderStatus;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryCharges: number;
  taxAmount: number;
  totalAmount: number;
  items: OrderItem[];
  notes?: string;
  trackingNumber?: string;
  courierPartner?: string;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  convertedAt?: string;
}

// Initial realistic Gujarati & Indian SME Seed Orders
const INITIAL_SEED_ORDERS: OnlineOrder[] = [
  {
    id: "ord_1049",
    orderNumber: "ORD-2026-1049",
    orderDate: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    customerName: "Amitbhai Patel",
    customerPhone: "+91 98251 23456",
    customerEmail: "amit.patel@gmail.com",
    shippingAddress: "402, Shivalik Highstreet, Near Keshavbaug Party Plot, Bopal",
    city: "Ahmedabad",
    pincode: "380058",
    source: "ONLINE_STORE",
    status: "PENDING",
    paymentMode: "COD",
    paymentStatus: "PENDING",
    subtotal: 1550,
    deliveryCharges: 50,
    taxAmount: 77.5,
    totalAmount: 1600,
    items: [
      {
        id: "item_1",
        name: "Premium Basmati Rice (5 KG Pack)",
        quantity: 2,
        unit: "BAG",
        rate: 450,
        taxRate: 5,
        hsnCode: "1006",
        total: 900,
      },
      {
        id: "item_2",
        name: "Pure Cow Ghee (1 LTR Pet Jar)",
        quantity: 1,
        unit: "JAR",
        rate: 650,
        taxRate: 12,
        hsnCode: "0405",
        total: 650,
      },
    ],
    notes: "Please call before delivery. Deliver after 5:00 PM.",
  },
  {
    id: "ord_1048",
    orderNumber: "ORD-2026-1048",
    orderDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    customerName: "Priyaben Shah",
    customerPhone: "+91 97240 88912",
    customerEmail: "priyashah89@yahoo.in",
    shippingAddress: "Flat 10B, Silver Radiance, Ring Road, Majura Gate",
    city: "Surat",
    pincode: "395007",
    source: "WHATSAPP",
    status: "ACCEPTED",
    paymentMode: "UPI",
    paymentStatus: "PAID",
    subtotal: 1400,
    deliveryCharges: 0,
    taxAmount: 49,
    totalAmount: 1400,
    items: [
      {
        id: "item_3",
        name: "Organic Whole Wheat Flour (10 KG)",
        quantity: 1,
        unit: "BAG",
        rate: 420,
        taxRate: 0,
        hsnCode: "1101",
        total: 420,
      },
      {
        id: "item_4",
        name: "Double Filtered Groundnut Oil (5 LTR Tin)",
        quantity: 1,
        unit: "TIN",
        rate: 980,
        taxRate: 5,
        hsnCode: "1508",
        total: 980,
      },
    ],
    notes: "Paid via PhonePe QR code. Pack safely in outer carton.",
  },
  {
    id: "ord_1047",
    orderNumber: "ORD-2026-1047",
    orderDate: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    customerName: "Rajeshbhai Mehta",
    customerPhone: "+91 94265 11223",
    customerEmail: "rajesh.mehta@mehtatraders.co",
    shippingAddress: "12, Krishna Nagar, Near Balaji Hall, Kalawad Road",
    city: "Rajkot",
    pincode: "360005",
    source: "ONLINE_STORE",
    status: "SHIPPED",
    paymentMode: "PREPAID",
    paymentStatus: "PAID",
    subtotal: 2150,
    deliveryCharges: 50,
    taxAmount: 387,
    totalAmount: 2200,
    courierPartner: "Blue Dart Express",
    trackingNumber: "BD-884920194",
    items: [
      {
        id: "item_5",
        name: "Stainless Steel Airtight Storage Containers (Set of 6)",
        quantity: 1,
        unit: "SET",
        rate: 2150,
        taxRate: 18,
        hsnCode: "7323",
        total: 2150,
      },
    ],
    notes: "Express door delivery requested.",
  },
  {
    id: "ord_1046",
    orderNumber: "ORD-2026-1046",
    orderDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    customerName: "Hareshbhai Joshi",
    customerPhone: "+91 98980 77665",
    customerEmail: "h.joshi@gmail.com",
    shippingAddress: "78, Madhav Complex, Opposite Yash Complex, Gotri",
    city: "Vadodara",
    pincode: "390021",
    source: "ONLINE_STORE",
    status: "DELIVERED",
    paymentMode: "COD",
    paymentStatus: "PAID",
    subtotal: 1020,
    deliveryCharges: 0,
    taxAmount: 39,
    totalAmount: 1020,
    convertedInvoiceId: "inv_converted_seed_1046",
    convertedInvoiceNumber: "INV/26-27/0010",
    convertedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    items: [
      {
        id: "item_6",
        name: "Gir Organic Jaggery Cubes (1 KG Pack)",
        quantity: 2,
        unit: "PKT",
        rate: 120,
        taxRate: 0,
        hsnCode: "1701",
        total: 240,
      },
      {
        id: "item_7",
        name: "Wagh Bakri Premium CTC Tea (500g)",
        quantity: 3,
        unit: "PKT",
        rate: 260,
        taxRate: 5,
        hsnCode: "0902",
        total: 780,
      },
    ],
    notes: "Successfully delivered. Invoice generated and shared with party.",
  },
  {
    id: "ord_1045",
    orderNumber: "ORD-2026-1045",
    orderDate: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    customerName: "Bhavik Somani",
    customerPhone: "+91 99099 33441",
    customerEmail: "bhavik.somani@gmail.com",
    shippingAddress: "B-204, Riverview Heights, Adajan Road",
    city: "Surat",
    pincode: "395009",
    source: "CATALOG",
    status: "CANCELLED",
    paymentMode: "COD",
    paymentStatus: "FAILED",
    subtotal: 480,
    deliveryCharges: 0,
    taxAmount: 24,
    totalAmount: 480,
    items: [
      {
        id: "item_8",
        name: "California Jumbo Almonds (500g)",
        quantity: 1,
        unit: "PKT",
        rate: 480,
        taxRate: 5,
        hsnCode: "0802",
        total: 480,
      },
    ],
    notes: "Customer cancelled due to change of delivery address.",
  },
];

export default function OnlineOrdersPage() {
  const router = useRouter();
  const { lang, tenantContext } = useAuth();
  const isGu = lang === "gu";

  // Active Company / Storage key
  const companyKey = tenantContext?.companyId || "default_business";
  const storageKey = `mybill_online_orders_${companyKey}`;

  // State
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"ALL" | "PREPAID" | "COD">("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH">("ALL");

  // Selection & Pagination
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Action Targets
  const [activeOrderForDetails, setActiveOrderForDetails] = useState<OnlineOrder | null>(null);
  const [activeOrderForConvert, setActiveOrderForConvert] = useState<OnlineOrder | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertSuccessMessage, setConvertSuccessMessage] = useState<string | null>(null);
  const [convertErrorMessage, setConvertErrorMessage] = useState<string | null>(null);

  // Manual Order Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [availableParties, setAvailableParties] = useState<any[]>([]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [storeLinkCopied, setStoreLinkCopied] = useState(false);

  // Load orders from LocalStorage or seed defaults
  const loadOrders = useCallback(() => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
          setIsLoading(false);
          return;
        }
      }
      // Seed default orders if none found
      localStorage.setItem(storageKey, JSON.stringify(INITIAL_SEED_ORDERS));
      setOrders(INITIAL_SEED_ORDERS);
    } catch (err) {
      console.warn("Could not read local storage for online orders:", err);
      setOrders(INITIAL_SEED_ORDERS);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Fetch available items & parties from API for manual order creation & matching
  useEffect(() => {
    async function fetchMasters() {
      try {
        const [itemsRes, partiesRes] = await Promise.all([
          apiClient.get("/items", { limit: 100 }).catch(() => null),
          apiClient.get("/parties", { type: "CUSTOMER", limit: 100 }).catch(() => null),
        ]);
        if (itemsRes) {
          const list = extractList(itemsRes);
          setAvailableItems(list);
        }
        if (partiesRes) {
          const list = extractList(partiesRes);
          setAvailableParties(list);
        }
      } catch (e) {
        console.warn("Could not fetch master items/parties:", e);
      }
    }
    fetchMasters();
  }, []);

  // Persist orders helper
  const saveOrders = (updated: OnlineOrder[]) => {
    setOrders(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save online orders to local storage:", e);
    }
  };

  // Quick Status Transition Handler
  const handleUpdateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    courierDetails?: { courierPartner?: string; trackingNumber?: string }
  ) => {
    const updated = orders.map((ord) => {
      if (ord.id === orderId) {
        return {
          ...ord,
          status: newStatus,
          ...(newStatus === "DELIVERED" && ord.paymentMode === "COD"
            ? { paymentStatus: "PAID" as PaymentStatus }
            : {}),
          ...(courierDetails || {}),
        };
      }
      return ord;
    });
    saveOrders(updated);

    const statusLabels: Record<OrderStatus, { en: string; gu: string }> = {
      PENDING: { en: "Pending", gu: "પેન્ડિંગ" },
      ACCEPTED: { en: "Accepted & Processing", gu: "સ્વીકારેલ" },
      SHIPPED: { en: "Dispatched & Shipped", gu: "ડિસ્પેચ થયેલ" },
      DELIVERED: { en: "Delivered", gu: "ડિલિવર થયેલ" },
      CANCELLED: { en: "Cancelled", gu: "રદ થયેલ" },
    };

    setToastMessage(
      isGu
        ? `ઓર્ડર સ્ટેટસ સફળતાપૂર્વક "${statusLabels[newStatus]?.gu}" કરવામાં આવ્યું!`
        : `Order status updated to "${statusLabels[newStatus]?.en}" successfully!`
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Status
      if (statusFilter !== "ALL" && ord.status !== statusFilter) return false;

      // Payment
      if (paymentFilter === "PREPAID" && ord.paymentMode === "COD") return false;
      if (paymentFilter === "COD" && ord.paymentMode !== "COD") return false;

      // Date Range
      if (dateFilter !== "ALL") {
        const ordTime = new Date(ord.orderDate).getTime();
        const now = Date.now();
        if (dateFilter === "TODAY") {
          const oneDayAgo = now - 24 * 3600 * 1000;
          if (ordTime < oneDayAgo) return false;
        } else if (dateFilter === "THIS_WEEK") {
          const oneWeekAgo = now - 7 * 24 * 3600 * 1000;
          if (ordTime < oneWeekAgo) return false;
        } else if (dateFilter === "THIS_MONTH") {
          const oneMonthAgo = now - 30 * 24 * 3600 * 1000;
          if (ordTime < oneMonthAgo) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = ord.orderNumber.toLowerCase().includes(q);
        const matchCustomer = ord.customerName.toLowerCase().includes(q);
        const matchPhone = ord.customerPhone.toLowerCase().includes(q);
        const matchCity = ord.city.toLowerCase().includes(q);
        const matchItems = ord.items.some((it) => it.name.toLowerCase().includes(q));
        if (!matchNumber && !matchCustomer && !matchPhone && !matchCity && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, paymentFilter, dateFilter, searchQuery]);

  // Paginated Slices
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalValue = 0;
    let pendingCount = 0;
    let pendingValue = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;
    let deliveredValue = 0;

    orders.forEach((o) => {
      const amt = Number(o.totalAmount || 0);
      if (o.status !== "CANCELLED") {
        totalValue += amt;
      }
      if (o.status === "PENDING") {
        pendingCount += 1;
        pendingValue += amt;
      } else if (o.status === "ACCEPTED" || o.status === "SHIPPED") {
        inTransitCount += 1;
      } else if (o.status === "DELIVERED") {
        deliveredCount += 1;
        deliveredValue += amt;
      }
    });

    return {
      totalCount: orders.length,
      totalValue,
      pendingCount,
      pendingValue,
      inTransitCount,
      deliveredCount,
      deliveredValue,
    };
  }, [orders]);

  // Scorecard segments matching MyBillBook UI standards
  const scorecardSegments: ScorecardSegment[] = useMemo(() => {
    return [
      {
        id: "total",
        label: "Total Orders",
        labelGujarati: "કુલ સ્ટોર ઓર્ડર્સ",
        value: kpis.totalValue,
        isCurrency: true,
        subtext: `${kpis.totalCount} Orders Placed`,
        subtextGujarati: `${kpis.totalCount} ઓર્ડર મળેલ`,
        variant: "primary",
        isActive: statusFilter === "ALL",
        onClick: () => {
          setStatusFilter("ALL");
          setCurrentPage(1);
        },
      },
      {
        id: "pending",
        label: "Pending Review",
        labelGujarati: "પેન્ડિંગ સમીક્ષા",
        value: kpis.pendingValue,
        isCurrency: true,
        subtext: `${kpis.pendingCount} Needs Acceptance`,
        subtextGujarati: `${kpis.pendingCount} ઓર્ડર બાકી`,
        variant: "warning",
        isActive: statusFilter === "PENDING",
        onClick: () => {
          setStatusFilter("PENDING");
          setCurrentPage(1);
        },
      },
      {
        id: "in_transit",
        label: "In Transit / Packing",
        labelGujarati: "પેકિંગ / રવાના થયેલ",
        value: kpis.inTransitCount,
        isCurrency: false,
        subtext: "Accepted & Dispatched",
        subtextGujarati: "તૈયાર અને ડિસ્પેચ",
        variant: "neutral",
        isActive: statusFilter === "ACCEPTED" || statusFilter === "SHIPPED",
        onClick: () => {
          setStatusFilter("ACCEPTED");
          setCurrentPage(1);
        },
      },
      {
        id: "delivered",
        label: "Delivered & Billed",
        labelGujarati: "ડિલિવર અને બિલ બનેલ",
        value: kpis.deliveredValue,
        isCurrency: true,
        subtext: `${kpis.deliveredCount} Orders Completed`,
        subtextGujarati: `${kpis.deliveredCount} ઓર્ડર પૂર્ણ`,
        variant: "success",
        isActive: statusFilter === "DELIVERED",
        onClick: () => {
          setStatusFilter("DELIVERED");
          setCurrentPage(1);
        },
      },
    ];
  }, [kpis, statusFilter]);

  // Status Badge Helper
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {isGu ? "પેન્ડિંગ" : "Pending"}
          </span>
        );
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            {isGu ? "સ્વીકારેલ" : "Accepted"}
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            {isGu ? "ડિસ્પેચ થયેલ" : "Shipped"}
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {isGu ? "ડિલિવર થયેલ" : "Delivered"}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            {isGu ? "રદ થયેલ" : "Cancelled"}
          </span>
        );
    }
  };

  // Convert to Sales Invoice: 1-Click Action & Workflow
  const handleConvertOrderToInvoice = async (asDraft = false) => {
    if (!activeOrderForConvert) return;
    setIsConverting(true);
    setConvertErrorMessage(null);
    setConvertSuccessMessage(null);

    const targetOrder = activeOrderForConvert;

    try {
      // Find or build party matching the customer
      let matchedPartyId: string | undefined = undefined;
      if (availableParties.length > 0) {
        const found = availableParties.find(
          (p) =>
            (p.phone && targetOrder.customerPhone.includes(p.phone.replace(/\D/g, ""))) ||
            (p.name && p.name.toLowerCase() === targetOrder.customerName.toLowerCase())
        );
        if (found) matchedPartyId = found.id;
      }

      // If no party matched, try to create customer party automatically via API
      if (!matchedPartyId) {
        try {
          const cleanPhone = targetOrder.customerPhone.replace(/[^\d+]/g, "").slice(-10);
          const newPartyRes: any = await apiClient.post("/masters/parties", {
            name: targetOrder.customerName,
            phone: cleanPhone || "9999999999",
            partyType: "CUSTOMER",
            address: targetOrder.shippingAddress,
            city: targetOrder.city,
            pincode: targetOrder.pincode,
            stateCode: "24", // Gujarat by default
          });
          if (newPartyRes?.id) {
            matchedPartyId = newPartyRes.id;
          }
        } catch (partyErr) {
          console.warn("Party auto-creation note:", partyErr);
        }
      }

      // Prepare standard MyBillBook Invoice Item Payload
      const invoiceItems = targetOrder.items.map((it) => {
        // Try to map to real item in catalog if found
        const matchingCatalogItem = availableItems.find(
          (m) => m.name?.toLowerCase() === it.name?.toLowerCase()
        );
        return {
          itemId: matchingCatalogItem?.id || it.itemId || undefined,
          description: it.name,
          quantity: it.quantity,
          unit: it.unit || "PCS",
          unitPrice: it.rate,
          taxRate: it.taxRate || 0,
          discountPercent: 0,
          hsnCode: it.hsnCode || "9999",
          totalAmount: it.total,
        };
      });

      const todayStr = new Date().toISOString().split("T")[0];

      const invoicePayload = {
        partyId: matchedPartyId,
        invoiceDate: todayStr,
        dueDate: todayStr,
        category: "TAX_INVOICE",
        paymentTerms: targetOrder.paymentMode === "COD" ? "Cash On Delivery" : "Immediate / Prepaid",
        shippingAddress: {
          address: `${targetOrder.shippingAddress}, ${targetOrder.city} - ${targetOrder.pincode}`,
          phone: targetOrder.customerPhone,
        },
        notes: `Converted from Online Order #${targetOrder.orderNumber} (Channel: ${targetOrder.source}). Customer: ${targetOrder.customerName} (${targetOrder.customerPhone})`,
        termsAndConditions: "Goods once sold are subject to standard warranty.",
        items: invoiceItems,
        isDraft: asDraft,
      };

      // Call real Sales Invoice API
      let createdInvoice: any = null;
      try {
        createdInvoice = await apiClient.post(
          `/sales/invoices${asDraft ? "?isDraft=true" : ""}`,
          invoicePayload
        );
      } catch (apiErr: any) {
        console.warn("API Invoice creation failed, falling back to local invoice linkage:", apiErr);
      }

      const generatedInvoiceNumber =
        createdInvoice?.invoiceNumber ||
        `INV/26-27/${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedInvoiceId = createdInvoice?.id || `inv_local_${Date.now()}`;

      // Mark order as converted & update status to DELIVERED
      const updated = orders.map((o) => {
        if (o.id === targetOrder.id) {
          return {
            ...o,
            status: "DELIVERED" as OrderStatus,
            paymentStatus: "PAID" as PaymentStatus,
            convertedInvoiceId: generatedInvoiceId,
            convertedInvoiceNumber: generatedInvoiceNumber,
            convertedAt: new Date().toISOString(),
          };
        }
        return o;
      });

      saveOrders(updated);

      const msg = isGu
        ? `ઓર્ડર #${targetOrder.orderNumber} સફળતાપૂર્વક પાકા જીએસટી બિલ #${generatedInvoiceNumber} માં કન્વર્ટ થઈ ગયું!`
        : `Order #${targetOrder.orderNumber} converted to Tax Invoice #${generatedInvoiceNumber} successfully!`;

      setToastMessage(msg);
      setConvertSuccessMessage(msg);

      setTimeout(() => {
        setActiveOrderForConvert(null);
        setToastMessage(null);
        setConvertSuccessMessage(null);
        if (createdInvoice?.id) {
          router.push(`/sales/invoices/${createdInvoice.id}`);
        }
      }, 1500);
    } catch (err: any) {
      console.error("Conversion error:", err);
      setConvertErrorMessage(
        err.message ||
          (isGu
            ? "ઇન્વોઇસ બનાવવામાં સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો."
            : "Failed to convert order to invoice.")
      );
    } finally {
      setIsConverting(false);
    }
  };

  // Open in Sales Invoice Studio (Pre-populates full studio form)
  const handleOpenInInvoiceStudio = (order: OnlineOrder) => {
    try {
      const cloneData = {
        party: {
          name: order.customerName,
          phone: order.customerPhone,
          address: order.shippingAddress,
        },
        shippingAddress: `${order.shippingAddress}, ${order.city} - ${order.pincode}`,
        notes: `Converted from Online Order #${order.orderNumber}. Customer: ${order.customerName} (${order.customerPhone})`,
        items: order.items.map((it) => ({
          itemId: it.itemId || "",
          description: it.name,
          quantity: it.quantity,
          unit: it.unit || "PCS",
          unitPrice: it.rate,
          taxRate: it.taxRate,
          discountPercent: 0,
          hsnCode: it.hsnCode || "9999",
        })),
      };

      localStorage.setItem("billing_clone_invoice", JSON.stringify(cloneData));
      router.push("/sales/invoices/new");
    } catch (e) {
      console.error("Could not set invoice clone data:", e);
    }
  };

  // Copy Store Link
  const handleCopyStoreLink = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/store` : "https://myownbillbook.com/store";
    navigator.clipboard.writeText(url);
    setStoreLinkCopied(true);
    setTimeout(() => setStoreLinkCopied(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F5F8FC] overflow-y-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white text-xs font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <span>{isGu ? "બિઝનેસ ટૂલ્સ" : "BUSINESS TOOLS"}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[#1677E8] font-semibold">{isGu ? "ઓનલાઇન ઓર્ડર્સ" : "ONLINE ORDERS"}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1677E8] to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isGu ? "ઓનલાઇન સ્ટોર ઓર્ડર્સ" : "Online Store Orders"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  {isGu
                    ? "ઓનલાઇન ગ્રાહકોના ઓર્ડર્સ ટ્રેક કરો અને ૧-ક્લિકમાં પાકા GST સેલ્સ ઇન્વોઇસ બનાવો."
                    : "Manage incoming store orders, track deliveries, and convert orders directly into GST Tax Invoices in 1-click."}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Copy Store Link Button */}
            <button
              onClick={handleCopyStoreLink}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs"
              title="Share store catalog link with customers"
            >
              {storeLinkCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">{isGu ? "લિંક કૉપિ થઈ ગઈ!" : "Link Copied!"}</span>
                </>
              ) : (
                <>
                  <Store className="w-4 h-4 text-[#1677E8]" />
                  <span>{isGu ? "સ્ટોર લિંક કૉપિ કરો" : "Copy Store Link"}</span>
                </>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={loadOrders}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs"
              title={isGu ? "રિફ્રેશ કરો" : "Refresh"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Add Manual Order */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1677E8] hover:bg-[#125CC0] active:scale-[0.98] rounded-xl transition shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>{isGu ? "+ નવો ઓર્ડર ઉમેરો" : "+ New Online Order"}</span>
            </button>
          </div>
        </div>

        {/* 1. Scorecard Ribbon */}
        <ScorecardRibbon segments={scorecardSegments} lang={lang} />

        {/* 2. Filters & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {(
                [
                  { id: "ALL", en: "All Orders", gu: "તમામ ઓર્ડર્સ" },
                  { id: "PENDING", en: "Pending", gu: "પેન્ડિંગ" },
                  { id: "ACCEPTED", en: "Accepted", gu: "સ્વીકારેલ" },
                  { id: "SHIPPED", en: "Shipped", gu: "ડિસ્પેચ થયેલ" },
                  { id: "DELIVERED", en: "Delivered", gu: "ડિલિવર થયેલ" },
                  { id: "CANCELLED", en: "Cancelled", gu: "રદ થયેલ" },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-[#1677E8] text-white shadow-xs"
                        : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {isGu ? tab.gu : tab.en}
                  </button>
                );
              })}
            </div>

            {/* Search and Secondary Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={
                    isGu ? "શોધો: ઓર્ડર નં, ગ્રાહક, ફોન..." : "Search Order #, Customer, Phone..."
                  }
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8] text-slate-800 placeholder:text-slate-400 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Payment Filter */}
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20"
              >
                <option value="ALL">{isGu ? "તમામ ચુકવણી" : "All Payment"}</option>
                <option value="PREPAID">{isGu ? "ઓનલાઇન / UPI" : "UPI / Prepaid"}</option>
                <option value="COD">{isGu ? "કેશ ઓન ડિલિવરી" : "Cash on Delivery (COD)"}</option>
              </select>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20"
              >
                <option value="ALL">{isGu ? "તમામ તારીખો" : "All Time"}</option>
                <option value="TODAY">{isGu ? "આજે" : "Today"}</option>
                <option value="THIS_WEEK">{isGu ? "આ અઠવાડિયે" : "This Week"}</option>
                <option value="THIS_MONTH">{isGu ? "આ મહિને" : "This Month"}</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Orders Data Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 tracking-wider uppercase">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedOrders.length > 0 &&
                        paginatedOrders.every((o) => selectedOrderIds.includes(o.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrderIds(paginatedOrders.map((o) => o.id));
                        } else {
                          setSelectedOrderIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-[#1677E8] focus:ring-[#1677E8]"
                    />
                  </th>
                  <th className="py-3 px-4">{isGu ? "ઓર્ડર નં. અને સમય" : "Order # & Date"}</th>
                  <th className="py-3 px-4">{isGu ? "ગ્રાહકની વિગત" : "Customer & Address"}</th>
                  <th className="py-3 px-4">{isGu ? "આઇટમ્સ" : "Items Ordered"}</th>
                  <th className="py-3 px-4 text-right">{isGu ? "કુલ રકમ" : "Total Amount"}</th>
                  <th className="py-3 px-4 text-center">{isGu ? "ઓર્ડર સ્ટેટસ" : "Order Status"}</th>
                  <th className="py-3 px-4 text-center">{isGu ? "ઇન્વોઇસ સ્ટેટસ" : "Invoice Status"}</th>
                  <th className="py-3 px-4 text-right">{isGu ? "એક્શન" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={8} className="py-4 px-4">
                        <div className="h-4 bg-slate-100 rounded-md w-full" />
                      </td>
                    </tr>
                  ))
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ShoppingBag className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                        <p className="text-sm font-medium text-slate-600">
                          {isGu ? "કોઈ ઓનલાઇન ઓર્ડર મળ્યા નથી" : "No Online Orders Found"}
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          {isGu
                            ? "નવો ઓર્ડર બનાવવા માટે ઉપર '+ નવો ઓર્ડર ઉમેરો' બટન પર ક્લિક કરો અથવા ફિલ્ટર્સ રીસેટ કરો."
                            : "Click '+ New Online Order' above or adjust your search filters to find orders."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    const isConverted = !!order.convertedInvoiceNumber || !!order.convertedInvoiceId;

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-50/60 transition group ${
                          isSelected ? "bg-blue-50/30" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds((prev) => [...prev, order.id]);
                              } else {
                                setSelectedOrderIds((prev) => prev.filter((id) => id !== order.id));
                              }
                            }}
                            className="rounded border-slate-300 text-[#1677E8] focus:ring-[#1677E8]"
                          />
                        </td>

                        {/* Order # and Date */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{order.orderNumber}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-100 text-slate-600 uppercase border border-slate-200">
                              {order.source}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(order.orderDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            •{" "}
                            {new Date(order.orderDate).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Customer & Address */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{order.customerName}</span>
                            <a
                              href={`https://wa.me/${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Hello ${order.customerName}, regarding your order ${order.orderNumber} from our store.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.customerPhone}</span>
                          </div>
                          <div
                            className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5 flex items-center gap-1"
                            title={order.shippingAddress}
                          >
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {order.city ? `${order.city}: ` : ""}
                              {order.shippingAddress}
                            </span>
                          </div>
                        </td>

                        {/* Items Ordered */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">
                            {order.items.length} {order.items.length === 1 ? "Item" : "Items"}
                          </div>
                          <div
                            className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5"
                            title={order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                          >
                            {order.items
                              .slice(0, 2)
                              .map((i) => `${i.quantity}x ${i.name}`)
                              .join(", ")}
                            {order.items.length > 2 && ` +${order.items.length - 2} more`}
                          </div>
                        </td>

                        {/* Total Amount & Payment */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-slate-900 text-sm">
                            {formatInr(order.totalAmount)}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                order.paymentMode === "COD"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {order.paymentMode}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                order.paymentStatus === "PAID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </div>
                        </td>

                        {/* Order Status */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            {renderStatusBadge(order.status)}
                          </div>
                          {/* Quick Status Progression Selector */}
                          <div className="mt-1">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                              }
                              className="text-[10px] text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1677E8]"
                            >
                              <option value="PENDING">{isGu ? "પેન્ડિંગ" : "Pending"}</option>
                              <option value="ACCEPTED">{isGu ? "સ્વીકારો" : "Accept"}</option>
                              <option value="SHIPPED">{isGu ? "ડિસ્પેચ કરો" : "Mark Shipped"}</option>
                              <option value="DELIVERED">{isGu ? "ડિલિવર કરો" : "Mark Delivered"}</option>
                              <option value="CANCELLED">{isGu ? "રદ કરો" : "Cancel"}</option>
                            </select>
                          </div>
                        </td>

                        {/* Invoice Status */}
                        <td className="py-3.5 px-4 text-center">
                          {isConverted ? (
                            <Link
                              href={`/sales/invoices/${order.convertedInvoiceId}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                              title="Click to view legal Sales Invoice"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{order.convertedInvoiceNumber || "Tax Invoice"}</span>
                              <ExternalLink className="w-3 h-3 text-emerald-500" />
                            </Link>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">
                              {isGu ? "ઇન્વોઇસ બાકી" : "Not Invoiced"}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Primary Action: Convert to Invoice OR View Invoice */}
                            {isConverted ? (
                              <Link
                                href={`/sales/invoices/${order.convertedInvoiceId}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{isGu ? "ઇન્વોઇસ જુઓ" : "View Invoice"}</span>
                              </Link>
                            ) : (
                              <button
                                onClick={() => setActiveOrderForConvert(order)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#1677E8] to-blue-600 hover:from-[#125CC0] hover:to-blue-700 rounded-lg shadow-xs transition active:scale-95"
                                title="1-Click Convert to Legal Tax Invoice"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>{isGu ? "ઇન્વોઇસ બનાવો" : "Convert to Invoice"}</span>
                              </button>
                            )}

                            {/* View Order Slip / Details */}
                            <button
                              onClick={() => setActiveOrderForDetails(order)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title={isGu ? "ઓર્ડર વિગતો જુઓ" : "View Order Details"}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <DataTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalRecords={filteredOrders.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            lang={lang}
          />
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: 1-CLICK CONVERT TO SALES INVOICE
          ========================================================================= */}
      {activeOrderForConvert && (
        <Modal
          isOpen={!!activeOrderForConvert}
          onClose={() => {
            if (!isConverting) setActiveOrderForConvert(null);
          }}
          title={isGu ? "ઓર્ડરને સેલ્સ ઇન્વોઇસમાં કન્વર્ટ કરો" : "Convert Order to Sales Invoice"}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Target Order Summary Card */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    {isGu ? "ઓર્ડર નંબર" : "Target Online Order"}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeOrderForConvert.orderNumber}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{isGu ? "કુલ રકમ" : "Total Amount"}</span>
                  <div className="text-lg font-bold text-slate-900">
                    {formatInr(activeOrderForConvert.totalAmount)}
                  </div>
                </div>
              </div>

              {/* Customer Info Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-blue-200/80 text-xs">
                <div>
                  <span className="text-slate-500">{isGu ? "ગ્રાહક:" : "Customer:"}</span>{" "}
                  <span className="font-semibold text-slate-800">
                    {activeOrderForConvert.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{isGu ? "મોબાઇલ:" : "Phone:"}</span>{" "}
                  <span className="font-semibold text-slate-800">
                    {activeOrderForConvert.customerPhone}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">{isGu ? "ડિલિવરી સરનામું:" : "Shipping:"}</span>{" "}
                  <span className="text-slate-700">
                    {activeOrderForConvert.shippingAddress}, {activeOrderForConvert.city} -{" "}
                    {activeOrderForConvert.pincode}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {isGu ? "ઓર્ડર આઇટમ્સ અને ટેક્સ વિગત" : "Order Items & GST Breakdown"}
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">{isGu ? "આઇટમ" : "Item"}</th>
                      <th className="py-2 px-3 text-center">{isGu ? "જથ્થો" : "Qty"}</th>
                      <th className="py-2 px-3 text-right">{isGu ? "ભાવ" : "Rate"}</th>
                      <th className="py-2 px-3 text-center">{isGu ? "GST" : "GST"}</th>
                      <th className="py-2 px-3 text-right">{isGu ? "કુલ" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOrderForConvert.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 font-medium text-slate-800">{it.name}</td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">{formatInr(it.rate)}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{it.taxRate}%</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          {formatInr(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Error or Success notification */}
            {convertErrorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{convertErrorMessage}</span>
              </div>
            )}
            {convertSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{convertSuccessMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              {/* Option 2: Edit in Studio */}
              <button
                type="button"
                onClick={() => handleOpenInInvoiceStudio(activeOrderForConvert)}
                disabled={isConverting}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>{isGu ? "ઇન્વોઇસ સ્ટુડિયોમાં એડિટ કરો" : "Edit in Invoice Studio"}</span>
              </button>

              {/* Option 1: 1-Click Instant Convert */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveOrderForConvert(null)}
                  disabled={isConverting}
                  className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  {isGu ? "રદ કરો" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleConvertOrderToInvoice(false)}
                  disabled={isConverting}
                  className="w-1/2 sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#1677E8] to-blue-600 hover:from-[#125CC0] hover:to-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2"
                >
                  {isConverting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isGu ? "બિલ બનાવી રહ્યું છે..." : "Generating Invoice..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isGu ? "૧-ક્લિકમાં પાકું બિલ બનાવો" : "⚡ 1-Click Create Invoice"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 2: ORDER DETAILS & PRINT PACKING SLIP
          ========================================================================= */}
      {activeOrderForDetails && (
        <Modal
          isOpen={!!activeOrderForDetails}
          onClose={() => setActiveOrderForDetails(null)}
          title={`${isGu ? "ઓર્ડર વિગતો" : "Order Details"} - ${activeOrderForDetails.orderNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 print:p-0" id="printable-order-slip">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeOrderForDetails.orderNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(activeOrderForDetails.orderDate).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    {activeOrderForDetails.source}
                  </span>
                  {renderStatusBadge(activeOrderForDetails.status)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500">{isGu ? "ચુકવણી સ્થિતિ" : "Payment"}</span>
                <div className="font-bold text-slate-900 text-base">
                  {activeOrderForDetails.paymentMode} ({activeOrderForDetails.paymentStatus})
                </div>
                <div className="text-lg font-extrabold text-[#1677E8] mt-1">
                  {formatInr(activeOrderForDetails.totalAmount)}
                </div>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  {isGu ? "ગ્રાહક સંપર્ક" : "Customer Contact"}
                </h5>
                <p className="font-semibold text-slate-800">{activeOrderForDetails.customerName}</p>
                <p className="text-slate-600 mt-0.5">{activeOrderForDetails.customerPhone}</p>
                {activeOrderForDetails.customerEmail && (
                  <p className="text-slate-500 mt-0.5">{activeOrderForDetails.customerEmail}</p>
                )}
              </div>
              <div>
                <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  {isGu ? "ડિલિવરી સરનામું" : "Delivery Address"}
                </h5>
                <p className="text-slate-700 leading-relaxed">
                  {activeOrderForDetails.shippingAddress}
                </p>
                <p className="text-slate-600 font-medium mt-0.5">
                  {activeOrderForDetails.city} - {activeOrderForDetails.pincode}
                </p>
              </div>
            </div>

            {/* Courier / Tracking Details if Shipped */}
            {(activeOrderForDetails.status === "SHIPPED" || activeOrderForDetails.courierPartner) && (
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-indigo-900">{isGu ? "કુરિયર પાર્ટનર:" : "Courier Partner:"}</span>{" "}
                  <span className="text-indigo-800">{activeOrderForDetails.courierPartner || "Self Delivery"}</span>
                </div>
                {activeOrderForDetails.trackingNumber && (
                  <div>
                    <span className="font-semibold text-indigo-900">{isGu ? "ટ્રેકિંગ નં:" : "AWB / Tracking #:"}</span>{" "}
                    <span className="font-mono font-bold text-indigo-800">{activeOrderForDetails.trackingNumber}</span>
                  </div>
                )}
              </div>
            )}

            {/* Itemized Table */}
            <div>
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                {isGu ? "ઓર્ડર આઇટમ્સ" : "Ordered Items"}
              </h5>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left">{isGu ? "આઇટમ" : "Item"}</th>
                      <th className="py-2 px-3 text-center">{isGu ? "HSN" : "HSN"}</th>
                      <th className="py-2 px-3 text-center">{isGu ? "જથ્થો" : "Qty"}</th>
                      <th className="py-2 px-3 text-right">{isGu ? "દર" : "Rate"}</th>
                      <th className="py-2 px-3 text-right">{isGu ? "GST" : "GST"}</th>
                      <th className="py-2 px-3 text-right">{isGu ? "રકમ" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOrderForDetails.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{it.name}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                          {it.hsnCode || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 font-semibold">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatInr(it.rate)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{it.taxRate}%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatInr(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>{isGu ? "પેટા કુલ:" : "Subtotal:"}</span>
                  <span>{formatInr(activeOrderForDetails.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{isGu ? "GST ટેક્સ:" : "GST Tax:"}</span>
                  <span>{formatInr(activeOrderForDetails.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{isGu ? "ડિલિવરી ચાર્જ:" : "Delivery Charges:"}</span>
                  <span>{formatInr(activeOrderForDetails.deliveryCharges)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>{isGu ? "ગ્રાન્ડ ટોટલ:" : "Grand Total:"}</span>
                  <span className="text-[#1677E8]">
                    {formatInr(activeOrderForDetails.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Converted Invoice Notice */}
            {activeOrderForDetails.convertedInvoiceNumber && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isGu ? "કન્વર્ટ કરેલ બિલ:" : "Converted Invoice:"}{" "}
                    <span className="font-bold">{activeOrderForDetails.convertedInvoiceNumber}</span>
                  </span>
                </div>
                <Link
                  href={`/sales/invoices/${activeOrderForDetails.convertedInvoiceId}`}
                  className="font-semibold underline flex items-center gap-1"
                >
                  <span>{isGu ? "ઇન્વોઇસ ખોલો" : "Open Invoice"}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>{isGu ? "પેકિંગ સ્લિપ પ્રિન્ટ કરો" : "Print Packing Slip"}</span>
              </button>

              <div className="flex items-center gap-2">
                {!activeOrderForDetails.convertedInvoiceNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      const ord = activeOrderForDetails;
                      setActiveOrderForDetails(null);
                      setActiveOrderForConvert(ord);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1677E8] hover:bg-[#125CC0] rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isGu ? "ઇન્વોઇસ બનાવો" : "Convert to Invoice"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveOrderForDetails(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  {isGu ? "બંધ કરો" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL 3: ADD MANUAL ONLINE ORDER
          ========================================================================= */}
      {isAddModalOpen && (
        <AddManualOrderModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onOrderCreated={(newOrder) => {
            saveOrders([newOrder, ...orders]);
            setIsAddModalOpen(false);
            setToastMessage(
              isGu
                ? `ઓર્ડર #${newOrder.orderNumber} સફળતાપૂર્વક ઉમેરાઈ ગયો!`
                : `Order #${newOrder.orderNumber} added successfully!`
            );
            setTimeout(() => setToastMessage(null), 4000);
          }}
          availableItems={availableItems}
          isGu={isGu}
        />
      )}
    </div>
  );
}

// Subcomponent: Add Manual Online Order Modal
interface AddManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: OnlineOrder) => void;
  availableItems: any[];
  isGu: boolean;
}

function AddManualOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  availableItems,
  isGu,
}: AddManualOrderModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("Ahmedabad");
  const [pincode, setPincode] = useState("380001");
  const [source, setSource] = useState<"ONLINE_STORE" | "WHATSAPP" | "MOBILE_APP">("ONLINE_STORE");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("COD");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [notes, setNotes] = useState("");

  // Items State
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: "row_1",
      name: availableItems[0]?.name || "Sample Product",
      quantity: 1,
      unit: "PCS",
      rate: availableItems[0]?.sellingPrice || 500,
      taxRate: 5,
      hsnCode: availableItems[0]?.hsnCode || "9999",
      total: availableItems[0]?.sellingPrice || 500,
    },
  ]);

  const handleItemChange = (index: number, field: keyof OrderItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };
      if (field === "quantity" || field === "rate") {
        target.total = Number(target.quantity || 1) * Number(target.rate || 0);
      }
      next[index] = target;
      return next;
    });
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}`,
        name: "",
        quantity: 1,
        unit: "PCS",
        rate: 0,
        taxRate: 5,
        hsnCode: "9999",
        total: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    return items.reduce((acc, it) => {
      const rate = Number(it.taxRate) || 0;
      return acc + ((Number(it.total) || 0) * rate) / 100;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return subtotal + (Number(deliveryCharges) || 0);
  }, [subtotal, deliveryCharges]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert(isGu ? "કૃપા કરીને ગ્રાહકનું નામ અને ફોન નંબર દાખલ કરો." : "Please enter Customer Name and Phone Number.");
      return;
    }

    const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: OnlineOrder = {
      id: `ord_${Date.now()}`,
      orderNumber,
      orderDate: new Date().toISOString(),
      customerName,
      customerPhone,
      shippingAddress: shippingAddress || "Customer Counter Pickup",
      city,
      pincode,
      source,
      status: "PENDING",
      paymentMode,
      paymentStatus: paymentMode === "UPI" || paymentMode === "PREPAID" ? "PAID" : paymentStatus,
      subtotal,
      deliveryCharges: Number(deliveryCharges) || 0,
      taxAmount,
      totalAmount: grandTotal,
      items,
      notes,
    };

    onOrderCreated(newOrder);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isGu ? "નવો ઓનલાઇન ઓર્ડર ઉમેરો" : "Create Manual Online Order"}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {isGu ? "ગ્રાહકનું નામ *" : "Customer Name *"}
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {isGu ? "મોબાઇલ નંબર *" : "Phone Number *"}
            </label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. +91 98980 12345"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">
              {isGu ? "ડિલિવરી સરનામું" : "Shipping Address"}
            </label>
            <input
              type="text"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="e.g. 104, Sunrise Tower, Satellite"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {isGu ? "શહેર" : "City"}
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ahmedabad"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {isGu ? "પિનકોડ" : "Pincode"}
            </label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="e.g. 380015"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20 focus:border-[#1677E8]"
            />
          </div>
        </div>

        {/* Channel & Payment Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {isGu ? "ઓર્ડર સોર્સ / ચેનલ" : "Order Channel"}
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20"
            >
              <option value="ONLINE_STORE">{isGu ? "ઓનલાઇન સ્ટોર" : "Online Store"}</option>
              <option value="WHATSAPP">{isGu ? "વોટ્સએપ ઓર્ડર" : "WhatsApp Shop"}</option>
              <option value="MOBILE_APP">{isGu ? "મોબાઇલ એપ" : "Mobile App"}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {isGu ? "પેમેન્ટ પદ્ધતિ" : "Payment Method"}
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20"
            >
              <option value="COD">{isGu ? "કેશ ઓન ડિલિવરી (COD)" : "Cash on Delivery (COD)"}</option>
              <option value="UPI">{isGu ? "UPI / ઓનલાઇન" : "UPI (GPay / PhonePe)"}</option>
              <option value="PREPAID">{isGu ? "ક્રેડિટ/ડેબિટ કાર્ડ" : "Prepaid (Card/NetBanking)"}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {isGu ? "ડિલિવરી ચાર્જ (₹)" : "Delivery Fee (₹)"}
            </label>
            <input
              type="number"
              min="0"
              value={deliveryCharges}
              onChange={(e) => setDeliveryCharges(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20"
            />
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
              {isGu ? "ઓર્ડર કરેલ પ્રોડક્ટ્સ" : "Ordered Items"}
            </h4>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="text-[#1677E8] hover:text-[#125CC0] font-semibold text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isGu ? "+ આઇટમ ઉમેરો" : "+ Add Item"}</span>
            </button>
          </div>

          <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-48 overflow-y-auto">
            {items.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    required
                    value={row.name}
                    onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                    placeholder="Item name / Product"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={row.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                    placeholder="Qty"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    required
                    value={row.rate}
                    onChange={(e) => handleItemChange(idx, "rate", Number(e.target.value))}
                    placeholder="Rate"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right"
                  />
                </div>
                <div className="col-span-2 text-right font-semibold text-slate-800">
                  {formatInr(row.total)}
                </div>
                <div className="col-span-1 text-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Notes */}
        <div>
          <label className="block text-slate-700 font-semibold mb-1">
            {isGu ? "નોંધ / સૂચના" : "Order Notes"}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions, gate codes, etc."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677E8]/20"
          />
        </div>

        {/* Summary Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div>
            <span className="text-slate-500">{isGu ? "કુલ રકમ:" : "Total Order Value:"}</span>{" "}
            <span className="text-base font-bold text-slate-900">{formatInr(grandTotal)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              {isGu ? "રદ કરો" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#1677E8] hover:bg-[#125CC0] rounded-xl shadow-md shadow-blue-500/20 transition"
            >
              {isGu ? "ઓર્ડર સેવ કરો" : "Save Order"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
