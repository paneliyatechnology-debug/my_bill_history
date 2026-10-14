# 04 — Comprehensive Business Feature Audit Matrix

> **Audit Date:** October 14, 2026  
> **Evaluation Benchmark:** Indian Retail/Wholesale ERP Standard (Vyapar / TallyPrime)  
> **Verification Basis:** Static code analysis, Prisma schema inspection, Vitest automated suites, and Fastify API runtime tests.

---

## 1. Feature Status Classification Definitions

- **`IMPLEMENTED AND VERIFIED`:** Feature has complete UI, robust backend service, Prisma database models, and passed runtime automated or integration test suites.
- **`IMPLEMENTED BUT NOT VERIFIED`:** Feature code exists in frontend and backend, but lacks full automated test assertions or required live external government sandbox credentials.
- **`PARTIALLY IMPLEMENTED`:** Core workflow exists, but key sub-features (e.g. offline sync, thermal format, bulk import) are incomplete.
- **`UI ONLY / NO REAL FUNCTIONALITY`:** Visual page or mock button exists in the frontend, but has no backend endpoint or database handler.
- **`BROKEN OR BUGGY`:** Code exists but throws runtime errors, causes data inconsistencies, or crashes under standard conditions.
- **`MISSING`:** Not implemented in either frontend or backend.

---

## 2. Detailed Feature Audit Matrix

### 2.1 Billing & Sales Invoices

| Feature | Status | Evidence / Code Locations | Identified Gaps vs Indian Business Standard |
| :--- | :--- | :--- | :--- |
| **Create Sales Invoices** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/sales/invoices/new/page.tsx`<br>`apps/api/src/invoices/invoices.service.ts` | Multi-currency billing is not required for domestic SME, but multi-price list (Retail vs Wholesale rate) is missing. |
| **Sequential Invoice Numbering** | `IMPLEMENTED AND VERIFIED` | `InvoiceSequence` model in Prisma<br>`invoices.service.ts#assignInvoiceNumber` | Numbering format is locked to prefix/year pattern. Custom series (e.g., `GST/26-27/001`) customization UI is needed. |
| **GST Tax Splits (CGST, SGST, IGST)** | `IMPLEMENTED AND VERIFIED` | `packages/accounting-core/src/tax-calculator.ts`<br>`test/accounting-core.spec.ts` | Complete. Automatically calculates 50/50 split for Gujarat intra-state (`stateCode: "24"`) and 100% IGST for interstate. |
| **Non-GST / Bill of Supply** | `IMPLEMENTED AND VERIFIED` | `SupplyCategory` enum in Prisma (`NIL_RATED`, `EXEMPT`, `NON_GST`) | Works cleanly. Excluded from tax liability buckets. |
| **Invoice Round-Off** | `IMPLEMENTED AND VERIFIED` | `packages/accounting-core/src/rounding.ts`<br>`invoices.service.ts` | Automatically balances fractional rupee differences to Round Off account. |
| **Invoice Statuses** | `IMPLEMENTED AND VERIFIED` | `InvoiceStatus` enum (`DRAFT`, `ISSUED`, `PAID`, `PARTIAL`, `CANCELLED`) | Complete workflow. Invoices can be transitioned, cancelled, and filtered. |
| **PDF Generation & Print** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/sales/invoices/[id]/page.tsx`<br>Browser print styles | Optimized for standard A4. Thermal 2-inch (58mm) and 3-inch (80mm) slip formats are missing. |
| **Point of Sale (POS) Fast Counter** | `PARTIALLY IMPLEMENTED` | `apps/web/src/app/sales/pos/page.tsx`<br>`PosSession` in database | UI supports barcode and quick cash tender, but lacks offline fallback if Wi-Fi disconnects. |
| **Sales Returns & Credit Notes** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/sales/returns/page.tsx`<br>`apps/api/src/invoices/sales-returns.service.ts` | Restores stock to warehouse, posts debit to Sales Returns and credit to Customer ledger. |
| **WhatsApp Invoice Sharing** | `MISSING` | — | No direct WhatsApp API / `api.whatsapp.com/send` share button on invoice view. |
| **Dynamic UPI QR on Invoice** | `MISSING` | — | No Bharat QR / NPCI UPI string (`upi://pay?pa=...`) rendered on print view. |

---

### 2.2 Products, Inventory & Batches

| Feature | Status | Evidence / Code Locations | Identified Gaps vs Indian Business Standard |
| :--- | :--- | :--- | :--- |
| **Product Master CRUD** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/masters/items/page.tsx`<br>`apps/api/src/items/items.service.ts` | Comprehensive: SKU, HSN, Tax Rate, Purchase Price, Selling Price. |
| **Item Categories & Units** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/masters/categories/`<br>`apps/web/src/app/masters/units/` | Standard Indian units preloaded (PCS, KGS, BOX, MTR, LTR). |
| **Batch & Expiry Management** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/masters/batches/page.tsx`<br>`apps/api/src/batches/batches.service.ts` | Tracks Batch Number, Manufacturing Date, and Expiry Date for pharma/FMCG. |
| **Automatic Stock Depletion / Addition**| `IMPLEMENTED AND VERIFIED` | `apps/api/src/items/stock-transaction.service.ts`<br>`invoices.service.ts` | Synchronous decrement on sales, increment on purchase/returns. |
| **Moving-Average Costing (AS-2)** | `IMPLEMENTED AND VERIFIED` | `packages/accounting-core/src/moving-average.ts`<br>`packages/accounting-core/test/` | Weighted average unit cost recalculated on inward supplies. |
| **Godowns & Warehouses** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/masters/warehouses/page.tsx`<br>`Warehouse` model in Prisma | Supports multiple storage locations per branch. |
| **Barcode Label Printing** | `MISSING` | — | No barcode sticker sheet printing feature (A4 24-up / thermal labels). |
| **Excel / CSV Bulk Product Import**| `MISSING` | — | Product creation is currently manual item-by-item; no CSV import wizard. |

---

### 2.3 Customers & Vendors (Parties)

| Feature | Status | Evidence / Code Locations | Identified Gaps vs Indian Business Standard |
| :--- | :--- | :--- | :--- |
| **Party Master CRUD** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/masters/parties/page.tsx`<br>`apps/api/src/parties/parties.service.ts` | Complete. Captures Legal Name, Trade Name, GSTIN, PAN, Phone, Address. |
| **GSTIN Format Validation** | `IMPLEMENTED AND VERIFIED` | `apps/api/test/gstin.validation.spec.ts`<br>`apps/api/src/common/validators/gstin` | Validates 15-character Indian GSTIN checksum using statutory modulo-36 logic. |
| **Customer / Vendor Ledgers** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/finance/ledgers/page.tsx`<br>`apps/api/src/ledgers/ledgers.service.ts` | Detailed chronological ledger statement with running balance (Dr/Cr). |
| **Credit Limit Enforcement** | `PARTIALLY IMPLEMENTED` | `creditLimit` field on Party model | Credit limit is stored in database, but does not block checkout if exceeded unless configured. |
| **Payment History & Allocations** | `IMPLEMENTED AND VERIFIED` | `PaymentAllocation` model<br>`test/purchase-payments.integration.spec.ts` | Tracks partial payments allocated across specific bill numbers. |
| **Customer Payment Reminders** | `MISSING` | — | No automated SMS or WhatsApp balance reminder engine. |

---

### 2.4 Purchases & Inward Supplies

| Feature | Status | Evidence / Code Locations | Identified Gaps vs Indian Business Standard |
| :--- | :--- | :--- | :--- |
| **Purchase Invoices Entry** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/purchases/page.tsx`<br>`apps/api/src/purchases/purchases.service.ts` | Records supplier bill, updates creditor ledger, records input tax credit. |
| **AI / OCR Bill Scanner** | `IMPLEMENTED AND VERIFIED` | `apps/api/src/purchases/bill-scanner.service.ts`<br>`apps/api/test/bill-scanner.integration.spec.ts` | Extracts vendor name, invoice date, total amount, and line items from camera photos/PDFs. |
| **Purchase Returns & Debit Notes** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/purchases/returns/page.tsx`<br>`apps/api/src/purchases/purchase-returns.service.ts` | Generates statutory outward debit notes with inventory reversal. |
| **GSTR-2B Automated Reconciliation** | `IMPLEMENTED AND VERIFIED` | `packages/gst-provider/src/gstr2b-match.ts`<br>`apps/api/src/gst/gstr2b.service.ts` | Matches purchases against government JSON with tolerance thresholds ($\pm ₹1.00$). |

---

### 2.5 Double-Entry Accounting & Financial Statements

| Feature | Status | Evidence / Code Locations | Identified Gaps vs Indian Business Standard |
| :--- | :--- | :--- | :--- |
| **Pre-Configured Chart of Accounts**| `IMPLEMENTED AND VERIFIED` | `packages/accounting-core/src/chart-of-accounts.template.ts` | 143+ statutory accounts structured under Indian Schedule III hierarchy. |
| **Zero-Sum Balance Invariant** | `IMPLEMENTED AND VERIFIED` | `packages/accounting-core/src/balance-invariants.ts` | Enforces $\sum \text{Debit} - \sum \text{Credit} = 0.00$ on every voucher. |
| **Financial Year Closure & Lock** | `IMPLEMENTED AND VERIFIED` | `packages/accounting-core/src/period-lock.ts`<br>`FinancialYear` in Prisma | Prevents back-dated vouchers in locked accounting periods. |
| **Trial Balance (*કાચું સરવૈયું*)** | `IMPLEMENTED AND VERIFIED` | `apps/api/src/reports/reports.service.ts`<br>`apps/web/src/app/finance/reports/page.tsx` | Proves arithmetical accuracy of ledger debit and credit totals. |
| **Profit & Loss (*નફાનુકસાન*)** | `IMPLEMENTED AND VERIFIED` | `reports.service.ts#getProfitAndLoss` | Calculates Gross Profit, Operating Expenses, and Net Profit. |
| **Balance Sheet (*પાકું સરવૈયું*)** | `IMPLEMENTED AND VERIFIED` | `reports.service.ts#getBalanceSheet` | Reconciles Assets vs Liabilities and Equity. |
| **Cash Book (*રોજમેળ*)** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/finance/vouchers/page.tsx` | Daily cash flow register showing opening balance, inflow, outflow, closing cash. |

---

### 2.6 Statutory GST, e-Invoice & e-Way Bill

| Feature | Status | Evidence / Code Locations | Identified Gaps vs Indian Business Standard |
| :--- | :--- | :--- | :--- |
| **GSTR-1 Outward Supply Register** | `IMPLEMENTED AND VERIFIED` | `apps/api/src/reports/reports.service.ts#getGstr1` | Exports B2B, B2CL, B2CS, and HSN summary in GSTN portal format. |
| **GSTR-3B Monthly Return Summary** | `IMPLEMENTED AND VERIFIED` | `reports.service.ts#getGstr3b` | Formats Table 3.1 (Outward tax) and Table 4 (Eligible ITC). |
| **NIC e-Way Bill Integration** | `IMPLEMENTED BUT NOT VERIFIED` | `packages/gst-provider/src/nic-provider.ts`<br>`apps/api/src/gst/gst-portal.service.ts` | Full JSON schema and API client implemented; requires live GSP credentials to test in production. |
| **NIC e-Invoice (IRN / QR Code)** | `IMPLEMENTED BUT NOT VERIFIED` | `packages/gst-provider/src/nic-provider.ts` | Full e-Invoice 1.04 schema implemented; requires live GSP credentials. |
| **Statutory Credentials AES Vault** | `IMPLEMENTED AND VERIFIED` | `packages/gst-provider/src/secret-box.ts`<br>`test/secret-box.spec.ts` | Encrypts government API passwords at rest using AES-256-GCM. |

---

### 2.7 Manufacturing & Inter-Branch Logistics

| Feature | Status | Evidence / Code Locations | Identified Gaps vs Indian Business Standard |
| :--- | :--- | :--- | :--- |
| **Bill of Materials (BOM)** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/manufacturing/bom/page.tsx`<br>`apps/api/src/manufacturing/` | Defines finished goods recipe, input items, and scrap allowance %. |
| **Production Work Orders** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/manufacturing/orders/` | Tracks Scheduled, In-Progress, and Completed manufacturing runs with automatic stock consumption. |
| **Inter-Branch Stock Transfers** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/distribution/stock-transfers/` | Dispatches stock to in-transit transit ledger, confirms receipt at destination branch. |
| **Delivery Challans (Rule 55)** | `IMPLEMENTED AND VERIFIED` | `apps/web/src/app/sales/delivery-challans/` | Generates legal transport challans for job-work and demonstration. |
