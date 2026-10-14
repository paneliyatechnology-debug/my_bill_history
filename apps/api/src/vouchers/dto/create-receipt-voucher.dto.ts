export interface ReceiptAllocationDto {
  invoiceId: string;
  settledAmount: number | string;
  cashDiscountGiven?: number | string;
}

export interface CreateReceiptVoucherDto {
  partyId: string;
  voucherDate: string;
  depositToAccountId?: string;
  receivedAmount: number | string;
  paymentReference?: string;
  narration?: string;
  narrationGujarati?: string;
  allocations: ReceiptAllocationDto[];
}
