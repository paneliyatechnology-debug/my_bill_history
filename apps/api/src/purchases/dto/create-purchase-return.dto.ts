export interface CreatePurchaseReturnItemDto {
  purchaseItemId: string;
  quantity: number | string;
}

export interface CreatePurchaseReturnDto {
  returnDate?: string;
  reason?: string;
  reasonGujarati?: string;
  warehouseId?: string;
  items: CreatePurchaseReturnItemDto[];
}
