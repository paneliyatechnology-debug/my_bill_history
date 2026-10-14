import { PaymentMode } from "@billing/shared-types";
import { CreateSalesInvoiceItemDto } from "./create-sales-invoice.dto";

export interface PosCheckoutDto {
  customerPhone?: string;
  customerName?: string;
  partyId?: string;
  paymentMode?: PaymentMode;
  tenderedSplit?: {
    cash?: number;
    upiQr?: number;
    bankTransfer?: number;
    cheque?: number;
  };
  items: CreateSalesInvoiceItemDto[];
  warehouseId?: string;
  branchId?: string;
  notes?: string;
}
