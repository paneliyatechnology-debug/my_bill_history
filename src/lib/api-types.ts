export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T> {
  items: T[];
  pagination: PaginationMeta;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PartySummary {
  id: string;
  name: string;
  nameGujarati?: string | null;
  phone?: string | null;
  gstin?: string | null;
  stateCode?: string | null;
  type?: string;
}

export interface DocumentRefSummary {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  grandTotal: number;
}

export interface SalesInvoiceListItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  category: string;
  status: string;
  isB2B: boolean;
  paymentMode: string | null;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  outstandingBalance: number;
  returnedAmount: number;
  netGrandTotal: number;
  isFullyReturned: boolean;
  totalRemainingQty: number;
  party: PartySummary | null;
  convertedInvoice: DocumentRefSummary | null;
  sourceQuotation: DocumentRefSummary | null;
  quotationNumber: string | null;
  quotationId: string | null;
  printUrl: string;
  pdfUrl: string;
}

export interface PurchaseInvoiceListItem {
  id: string;
  vendorInvoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  itcEligibility: string | null;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  outstandingBalance: number;
  returnedAmount: number;
  netGrandTotal: number;
  isFullyReturned: boolean;
  totalRemainingQty: number;
  party: PartySummary | null;
}

export interface ItemSummary {
  id: string;
  name: string;
  nameGujarati?: string | null;
  type: string;
  sku: string | null;
  barcode: string | null;
  hsnCode: string | null;
  isActive: boolean;
  minStockLevel: number;
  taxRate: number;
  retailPrice: number;
  salesPrice: number;
  wholesalePrice: number;
  purchaseRate: number;
  purchasePrice: number;
  mrp: number;
  currentStock: number;
  unit: string;
  unitName: string;
  categoryId: string | null;
  categoryName: string | null;
}
