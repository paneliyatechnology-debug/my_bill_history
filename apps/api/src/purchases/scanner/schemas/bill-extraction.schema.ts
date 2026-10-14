import { z } from "zod";

/**
 * Zod schema for extracted purchase line items.
 */
export const ExtractedBillItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Item description is required"),
  rawText: z.string().optional(),
  hsnCode: z.string().nullable().optional(),
  quantity: z.union([z.number(), z.string()]).default(1),
  unit: z.string().nullable().optional(),
  unitPrice: z.union([z.number(), z.string()]).default(0),
  discountAmount: z.union([z.number(), z.string()]).nullable().optional().default(0),
  taxableAmount: z.union([z.number(), z.string()]).default(0),
  taxRate: z.union([z.number(), z.string()]).default(18),
  cgstAmount: z.union([z.number(), z.string()]).nullable().optional().default(0),
  sgstAmount: z.union([z.number(), z.string()]).nullable().optional().default(0),
  igstAmount: z.union([z.number(), z.string()]).nullable().optional().default(0),
  totalAmount: z.union([z.number(), z.string()]).default(0),
  confidence: z.number().min(0).max(100).default(80),
  itemType: z.enum(["PRODUCT", "SERVICE"]).optional().default("PRODUCT"),
  isAmbiguous: z.boolean().optional().default(false),
  matchedItemId: z.string().nullable().optional(),
  matchedItemName: z.string().nullable().optional(),
  matchedItemScore: z.number().optional(),
  matchType: z.enum(["BARCODE", "SKU", "EXACT_NAME", "FUZZY_NAME", "NEW_PRODUCT"]).optional(),
  suggestedItems: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string().nullable().optional(),
      score: z.number(),
    })
  ).optional().default([]),
});

export type ExtractedBillItemInput = z.infer<typeof ExtractedBillItemSchema>;

/**
 * Zod schema for complete extracted bill data.
 */
export const ExtractedBillDataSchema = z.object({
  currency: z.string().default("INR"),
  exchangeRate: z.number().nullable().optional(),
  sourceGrandTotal: z.string().nullable().optional(),
  isRcm: z.boolean().optional().default(false),
  supplier: z.object({
    name: z.string().nullable().optional(),
    gstin: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    confidence: z.number().min(0).max(100).default(80),
    matchedPartyId: z.string().nullable().optional(),
    matchedPartyName: z.string().nullable().optional(),
    matchedPartyGstin: z.string().nullable().optional(),
    matchedPartyScore: z.number().optional(),
    isNewSupplier: z.boolean().optional().default(false),
  }),
  invoice: z.object({
    invoiceNumber: z.string().nullable().optional(),
    invoiceDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    placeOfSupply: z.string().nullable().optional(),
    confidence: z.number().min(0).max(100).default(80),
    isDuplicateWarning: z.boolean().optional().default(false),
  }),
  financials: z.object({
    subtotal: z.string().nullable().optional(),
    totalDiscount: z.string().nullable().optional(),
    taxableAmount: z.string().nullable().optional(),
    cgstAmount: z.string().nullable().optional(),
    sgstAmount: z.string().nullable().optional(),
    igstAmount: z.string().nullable().optional(),
    cessAmount: z.string().nullable().optional(),
    otherCharges: z.string().nullable().optional(),
    roundOff: z.string().nullable().optional(),
    grandTotal: z.string().nullable().optional(),
    isTaxMismatch: z.boolean().optional().default(false),
    taxMismatchReason: z.string().nullable().optional(),
    confidence: z.number().min(0).max(100).default(80),
  }),
  items: z.array(ExtractedBillItemSchema).default([]),
  documentMetadata: z.object({
    fileName: z.string().default("bill.pdf"),
    pageCount: z.number().int().min(1).default(1),
    isMultiPage: z.boolean().default(false),
    overallConfidence: z.number().min(0).max(100).default(80),
    warnings: z.array(z.string()).default([]),
    engine: z.string().optional(),
    isUnreadable: z.boolean().optional().default(false),
  }),
});

export type ExtractedBillDataDto = z.infer<typeof ExtractedBillDataSchema>;

/**
 * Zod schema for editing/saving a scan draft
 */
export const UpdateScanDraftSchema = z.object({
  partyId: z.string().uuid().nullable().optional(),
  vendorInvoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  placeOfSupply: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  extractedData: ExtractedBillDataSchema.optional(),
});

export type UpdateScanDraftDto = z.infer<typeof UpdateScanDraftSchema>;

/**
 * Zod schema for confirming purchase scan
 */
export const ConfirmPurchaseScanSchema = z.object({
  partyId: z.string().optional(),
  createNewSupplier: z.boolean().optional().default(false),
  newSupplierDetails: z.object({
    name: z.string().min(1, "Supplier name is required"),
    gstin: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
  }).optional(),
  currency: z.string().optional().default("INR"),
  exchangeRate: z.number().optional().default(1),
  vendorInvoiceNumber: z.string().min(1, "Vendor invoice number is required"),
  invoiceDate: z.string().optional(),
  placeOfSupply: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  itcEligibility: z.string().optional().default("INPUT"),
  items: z.array(
    z.object({
      itemId: z.string().optional(), // Existing or newly created item ID
      createNewProduct: z.boolean().optional().default(false),
      itemType: z.enum(["PRODUCT", "SERVICE"]).optional().default("PRODUCT"),
      newProductDetails: z.object({
        name: z.string().min(1),
        itemType: z.enum(["PRODUCT", "SERVICE"]).optional().default("PRODUCT"),
        hsnCode: z.string().default("0000"),
        unitSymbol: z.string().default("PCS"),
        taxRate: z.number().default(18),
        purchasePrice: z.number().default(0),
        retailPrice: z.number().optional(),
      }).optional(),
      hsnCode: z.string().optional(),
      quantity: z.union([z.number(), z.string()]),
      unitPrice: z.union([z.number(), z.string()]),
      taxRate: z.union([z.number(), z.string()]),
    })
  ).min(1, "At least one purchase item is required"),
  idempotencyKey: z.string().optional(),
});

export type ConfirmPurchaseScanDto = z.infer<typeof ConfirmPurchaseScanSchema>;
