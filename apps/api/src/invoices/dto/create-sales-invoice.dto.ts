import {
  InvoiceCategory,
  InvoiceStatus,
  PaymentMode,
} from "@billing/shared-types";

export interface CreateSalesInvoiceItemDto {
  itemId: string;
  batchId?: string;
  description?: string;
  hsnCode?: string;
  quantity: number | string;
  unitPrice: number | string;
  discountPercent?: number | string;
  discountAmount?: number | string;
  taxRate: number | string;
  isTaxInclusive?: boolean;
}

export interface CreateSalesInvoiceDto {
  category?: InvoiceCategory;
  partyId?: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentMode?: PaymentMode;
  status?: InvoiceStatus;
  isDraft?: boolean;
  placeOfSupply?: string;
  isB2B?: boolean;
  isReverseCharge?: boolean;
  items: CreateSalesInvoiceItemDto[];
  warehouseId?: string;
  branchId?: string;
  termsAndConditions?: string;
  notes?: string;
  clientOfflineUuid?: string;
  autoGenerateEWayBill?: boolean;
  autoGenerateEInvoice?: boolean;
}
