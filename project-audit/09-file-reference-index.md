# 09 — File Reference Index & Dependency Cross-Reference

> **Audit Date:** October 14, 2026  
> **Repository:** `my_bill_history`  
> **Index Purpose:** Fast cross-referencing between Next.js routes, NestJS controllers/services, Prisma database models, and shared libraries.

---

## 1. Domain Feature Cross-Reference Index

| Business Domain | Next.js Frontend Page | NestJS API Controller / Service | Prisma Database Models | Shared Core Packages |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Profile** | `apps/web/src/app/login/page.tsx` | `apps/api/src/auth/auth.controller.ts`<br>`apps/api/src/auth/auth.service.ts` | `users`<br>`tenants`<br>`user_branch_assignments` | `@billing/shared-types`<br>(`UserRole`, `TenantContext`) |
| **Sales Invoices & Billing** | `apps/web/src/app/sales/invoices/page.tsx`<br>`apps/web/src/app/sales/invoices/new/page.tsx`<br>`apps/web/src/app/sales/invoices/[id]/page.tsx` | `apps/api/src/invoices/invoices.controller.ts`<br>`apps/api/src/invoices/invoices.service.ts` | `sales_invoices`<br>`sales_invoice_items`<br>`invoice_sequences` | `@billing/accounting-core`<br>(`calculateGstSplit`, `assertVoucherBalanced`) |
| **Point of Sale (POS)** | `apps/web/src/app/sales/pos/page.tsx` | `apps/api/src/invoices/invoices.controller.ts` | `pos_sessions`<br>`sales_invoices` | `@billing/shared-types` |
| **Sales Returns (Credit Notes)** | `apps/web/src/app/sales/returns/page.tsx` | `apps/api/src/invoices/sales-returns.controller.ts`<br>`apps/api/src/invoices/sales-returns.service.ts` | `sales_returns`<br>`sales_return_items`<br>`vouchers` | `@billing/accounting-core` |
| **Purchase Invoices** | `apps/web/src/app/purchases/page.tsx` | `apps/api/src/purchases/purchases.controller.ts`<br>`apps/api/src/purchases/purchases.service.ts` | `purchase_invoices`<br>`purchase_invoice_items` | `@billing/accounting-core`<br>(`computeWeightedAverageRate`) |
| **AI Bill Scanner / OCR** | `apps/web/src/app/purchases/components/bill-scanner-modal.tsx` | `apps/api/src/purchases/bill-scanner.service.ts` | `purchase_bill_scans` | `tesseract.js`<br>`Google Gemini Vision` |
| **Purchase Returns (Debit Notes)** | `apps/web/src/app/purchases/returns/page.tsx` | `apps/api/src/purchases/purchase-returns.controller.ts`<br>`apps/api/src/purchases/purchase-returns.service.ts` | `purchase_returns`<br>`outward_debit_notes` | `@billing/accounting-core` |
| **Payment Allocations** | Embedded in Invoices & Purchases | `apps/api/src/purchases/purchase-payments.service.ts` | `payment_allocations`<br>`vouchers` | `@billing/accounting-core` |
| **Product Masters & Items** | `apps/web/src/app/masters/items/page.tsx` | `apps/api/src/items/items.controller.ts`<br>`apps/api/src/items/items.service.ts` | `items`<br>`item_categories`<br>`units_of_measure` | `@billing/shared-types` |
| **Batch & Expiry Inventory** | `apps/web/src/app/masters/batches/page.tsx` | `apps/api/src/batches/batches.controller.ts`<br>`apps/api/src/batches/batches.service.ts` | `item_batches`<br>`stock_transactions` | `@billing/shared-types` |
| **Parties (Customers & Vendors)** | `apps/web/src/app/masters/parties/page.tsx` | `apps/api/src/parties/parties.controller.ts`<br>`apps/api/src/parties/parties.service.ts` | `parties`<br>`ledger_accounts` | `@billing/gst-provider`<br>(`validateGstinChecksum`) |
| **Double-Entry General Ledger** | `apps/web/src/app/finance/ledgers/page.tsx`<br>`apps/web/src/app/finance/vouchers/page.tsx` | `apps/api/src/vouchers/vouchers.controller.ts`<br>`apps/api/src/vouchers/vouchers.service.ts`<br>`apps/api/src/ledgers/ledgers.service.ts` | `vouchers`<br>`journal_entries`<br>`ledger_accounts`<br>`ledger_groups` | `@billing/accounting-core`<br>(`STANDARD_SME_ACCOUNTS`) |
| **Expenses Management** | `apps/web/src/app/finance/expenses/page.tsx` | `apps/api/src/vouchers/vouchers.controller.ts` | `vouchers`<br>`journal_entries` | `@billing/accounting-core` |
| **Financial Reports (P&L, BS)** | `apps/web/src/app/finance/reports/page.tsx` | `apps/api/src/reports/reports.controller.ts`<br>`apps/api/src/reports/reports.service.ts` | `journal_entries`<br>`ledger_accounts` | `@billing/accounting-core`<br>(`aggregateTrialBalance`) |
| **Statutory GST Returns (GSTR)** | `apps/web/src/app/gst/page.tsx` | `apps/api/src/reports/reports.controller.ts`<br>`apps/api/src/gst/gstr2b.service.ts` | `sales_invoices`<br>`purchase_invoices`<br>`gstr2b_imports`<br>`gstr2b_lines` | `@billing/gst-provider`<br>(`parseGstr2bJson`, `reconcileGstr2b`) |
| **NIC e-Way Bill & e-Invoice** | `apps/web/src/app/sales/invoices/[id]/page.tsx` | `apps/api/src/gst/gst-portal.service.ts` | `einvoice_records`<br>`eway_bill_records`<br>`gst_integration_configs` | `@billing/gst-provider`<br>(`NicProvider`, `SecretBox`) |
| **Manufacturing & BOM Recipes** | `apps/web/src/app/manufacturing/bom/page.tsx`<br>`apps/web/src/app/manufacturing/orders/page.tsx` | `apps/api/src/manufacturing/boms.controller.ts`<br>`apps/api/src/manufacturing/production-orders.controller.ts` | `bills_of_material`<br>`bom_items`<br>`production_orders`<br>`production_batches` | `@billing/shared-types`<br>(`ProductionStatus`) |
| **Stock Transfers & Logistics** | `apps/web/src/app/distribution/stock-transfers/page.tsx` | `apps/api/src/distribution/stock-transfers.controller.ts`<br>`apps/api/src/distribution/stock-transfers.service.ts` | `stock_transfers`<br>`stock_transfer_items`<br>`warehouses` | `@billing/shared-types`<br>(`StockTransferStatus`) |
| **Delivery Challans (Rule 55)** | `apps/web/src/app/sales/delivery-challans/page.tsx` | `apps/api/src/distribution/delivery-challans.controller.ts`<br>`apps/api/src/distribution/delivery-challans.service.ts` | `delivery_challans`<br>`delivery_challan_items` | `@billing/shared-types`<br>(`DeliveryChallanType`) |
| **Inventory GL Reconciliation** | Embedded in Reports | `apps/api/src/reconciliation/inventory-reconciliation.controller.ts`<br>`apps/api/src/reconciliation/perpetual-inventory.service.ts` | `stock_transactions`<br>`journal_entries` | `@billing/accounting-core` |
| **Audit Log Trail** | Background Service | `apps/api/src/audit/audit.service.ts` | `audit_logs` | SHA-256 Hash Chaining |

---

## 2. API Endpoints Reference Index

| HTTP Method | Route Endpoint | Controller | Access Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | `AuthController` | Public (Rate Limited) | Creates Tenant, Organization, Company, Branch, FY & Owner User |
| `POST` | `/api/v1/auth/login` | `AuthController` | Public (Rate Limited) | Authenticates with Phone & Password, returns JWT & Tenant context |
| `GET` | `/api/v1/auth/me` | `AuthController` | Authenticated | Fetches current user profile and company assignments |
| `POST` | `/api/v1/auth/switch-context` | `AuthController` | Authenticated | Switches active Company, Branch, or Financial Year |
| `GET` | `/api/v1/invoices` | `InvoicesController` | CASHIER+ | Lists sales invoices with status & date range filters |
| `POST` | `/api/v1/invoices` | `InvoicesController` | CASHIER+ | Generates a new sales invoice with automatic tax & stock updates |
| `GET` | `/api/v1/invoices/:id` | `InvoicesController` | CASHIER+ | Retrieves full invoice details with line items and taxes |
| `POST` | `/api/v1/invoices/:id/cancel`| `InvoicesController` | COMPANY_ADMIN+ | Cancels sales invoice and reverses stock and ledger entries |
| `GET` | `/api/v1/invoices/:id/pdf` | `InvoicesController` | CASHIER+ | Generates official printable PDF invoice |
| `POST` | `/api/v1/purchases` | `PurchasesController` | ACCOUNTANT+ | Records inward purchase bill from supplier |
| `POST` | `/api/v1/purchases/scan-bill`| `PurchasesController` | ACCOUNTANT+ | Uploads bill image/PDF for OCR text extraction |
| `GET` | `/api/v1/items` | `ItemsController` | CASHIER+ | Fetches item catalog with price and stock levels |
| `POST` | `/api/v1/items` | `ItemsController` | COMPANY_ADMIN+ | Creates new product master with HSN & GST rate |
| `GET` | `/api/v1/parties` | `PartiesController` | CASHIER+ | Lists customers and suppliers with ledger balances |
| `POST` | `/api/v1/parties` | `PartiesController` | CASHIER+ | Creates new customer or vendor with GSTIN check |
| `GET` | `/api/v1/vouchers` | `VouchersController` | ACCOUNTANT+ | Lists double-entry general ledger vouchers |
| `POST` | `/api/v1/vouchers` | `VouchersController` | ACCOUNTANT+ | Posts custom journal or contra voucher |
| `GET` | `/api/v1/reports/trial-balance` | `ReportsController` | ACCOUNTANT+ | Generates mathematical Trial Balance (*કાચું સરવૈયું*) |
| `GET` | `/api/v1/reports/pnl` | `ReportsController` | COMPANY_ADMIN+ | Generates Profit & Loss Statement (*નફાનુકસાન*) |
| `GET` | `/api/v1/reports/balance-sheet`| `ReportsController` | COMPANY_ADMIN+ | Generates Balance Sheet (*પાકું સરવૈયું*) |
| `GET` | `/api/v1/reports/gstr-1` | `ReportsController` | ACCOUNTANT+ | Generates GSTR-1 outward supply JSON/CSV format |
| `POST` | `/api/v1/gst/gstr-2b/imports` | `GstController` | ACCOUNTANT+ | Imports government GSTR-2B JSON for automated matching |
| `POST` | `/api/v1/gst/einvoice/:id/generate` | `GstController` | COMPANY_ADMIN+ | Generates statutory IRN and signed QR code via NIC API |
| `POST` | `/api/v1/gst/eway-bills/invoices/:id/generate` | `GstController` | COMPANY_ADMIN+ | Generates official e-Way Bill number via NIC portal |
| `GET` | `/api/v1/health` | `HealthController` | Public | Liveness probe returning service uptime |
| `GET` | `/api/v1/health/readiness` | `HealthController` | Public | Readiness probe checking live PostgreSQL connectivity |
