# Complete Indian Billing & Accounting SaaS Functionality Audit & Acceptance Report

**Date:** 14 October 2026  
**Repository:** `/home/dell/Jaydeep/Billing`  
**Commit:** `9043754` (with pending local verified UI/drawer fixes)  
**Verification Scope:** Full Application Audit (Sidebar Menus, Routes, Masters, Role-Based Access Control, Responsive Viewports, Accounting Invariants & External Dependencies) — Prior to Superadmin Development.

---

## 1. Executive Summary & Architecture Overview

The system is a multi-tenant Indian Billing and Double-Entry Accounting SaaS built as a Turborepo monorepo:
- **Frontend (`apps/web`):** Next.js 14 App Router, React 18, Tailwind CSS, Lucide icons, responsive navigation with English/Gujarati bilingual support.
- **Backend API (`apps/api`):** NestJS on Fastify, Prisma ORM, PostgreSQL with Row-Level Security (RLS) policies, JWT authentication, and tenant isolation via `x-organization-id` and `x-company-id`.
- **Core Packages:**
  - `@billing/database`: Prisma schema (`schema.prisma`), migrations, client, RLS session context.
  - `@billing/accounting-core`: Strict double-entry rules, debit=credit invariant checking, Indian GST rules (CGST/SGST/UTGST/IGST).
  - `@billing/gst-provider`: GSTR-1 / GSTR-3B compilation, GSTR-2B reconciliation engine, NIC E-Way & E-Invoice interface with mock sandbox safety gates.
  - `@billing/shared-types`: Common DTOs, Enums, and interface definitions.

---

## 2. Complete Inventory: Sidebar Menus, Routes, APIs & Chain Tracing

Status classifications:
- **`PASS`**: Verified working through UI, API, database persistence, and automated regression tests.
- **`FIXED`**: Discovered deficiency that was resolved and verified in this session.
- **`BLOCKED`**: Depends on external credentials, third-party infrastructure (e.g. NIC GSP portal, live banking UPI APIs), safely gated without mock falsification.
- **`PARTIAL`**: Real working endpoint/workflow exists, but secondary user interaction or optional sub-feature is deferred.

| Section / Menu Item | Route | API Endpoint(s) | Guards & Roles | DB Model(s) | Status | End-to-End Chain Trace |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Overview** | | | | | | |
| Dashboard | `/` | `GET /reports/dashboard-kpis`<br>`GET /reports/aging-summary`<br>`GET /reports/stock-summary`<br>`GET /invoices/sales` | TenantContextGuard, RolesGuard<br>(All authenticated roles) | `SalesInvoice`, `PurchaseInvoice`, `Voucher`, `StockTransaction` | **FIXED** | Dashboard cards extract KPI totals (`totalCustomerOutstanding`, `totalValuation` with Moving Weighted Average Cost) without runtime errors; quick links route to create screens. |
| **Sales & POS** | | | | | | |
| Sales Invoices | `/sales/invoices` | `GET /invoices/sales`<br>`POST /invoices/sales/:id/cancel` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `SALESMAN`, `CASHIER`) | `SalesInvoice`, `InvoiceSequence` | **PASS** | Lists invoices, filters by status/date/party, provides cancel action with reversing journal voucher and stock restoration. |
| Create Invoice | `/sales/invoices/new` | `POST /invoices/sales`<br>`GET /masters/parties`<br>`GET /masters/items` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `SALESMAN`, `CASHIER`) | `SalesInvoice`, `SalesInvoiceItem`, `StockTransaction`, `Voucher` | **PASS** | Validates party, HSN, calculates CGST/SGST/IGST/UTGST, acquires sequence lock, creates atomic voucher + stock ledger entries. |
| POS Terminal | `/pos` | `POST /invoices/sales` (Cash/POS mode)<br>`GET /masters/items` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `CASHIER`, `SALESMAN`) | `SalesInvoice`, `StockTransaction`, `Voucher` | **PASS** | Fast keyboard barcode search, item grid, instant cash settlement, thermal receipt print trigger (`window.print()`). |
| Credit Notes / Returns | `/sales/returns` | `GET /sales-returns`<br>`POST /sales-returns` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `SalesReturn`, `SalesReturnItem`, `StockTransaction`, `Voucher` | **PASS** | Validates returnable quantity against original invoice, reverses output GST, deducts receivable or creates customer credit. |
| Delivery Challans | `/sales/delivery-challans` | `GET /delivery-challans`<br>`POST /delivery-challans` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `BRANCH_MANAGER`) | `DeliveryChallan`, `DeliveryChallanItem`, `StockTransaction` | **PASS** | Dispatches stock under GST Rule 55 without posting financial tax voucher; supports job work, approval, and supply dispatch. |
| **Master Data** | | | | | | |
| Parties (Khata) | `/masters/parties` | `GET /masters/parties`<br>`POST /masters/parties`<br>`PUT /masters/parties/:id`<br>`DELETE /masters/parties/:id` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `Party` | **FIXED** | Full CRUD, GSTIN checksum validation, state code detection, opening balance. **Fixed**: Added direct "Ledger / ખાતાવહી" button linking to Party Statement. |
| HSN / SAC Codes | `/masters/hsn` | `GET /hsn`<br>`GET /hsn/search`<br>`GET /hsn/:id`<br>`POST /hsn`<br>`PUT /hsn/:id`<br>`PATCH /hsn/:id/status`<br>`DELETE /hsn/:id` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `AUDITOR`) | `HsnMaster`, `Item` | **PASS** | Centralized master for GST goods (HSN) and services (SAC) classification. 49 verified official codes, leading-zero preserving string storage, tenant RLS, dropdown autocomplete, active toggle, item link protection. |
| Items Catalog | `/masters/items` | `GET /masters/items`<br>`POST /masters/items`<br>`PUT /masters/items/:id`<br>`DELETE /masters/items/:id` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `Item`, `UnitOfMeasure`, `ItemCategory`, `HsnMaster` | **PASS** | Full CRUD, HSN/SAC code validation linked to central master, tax rate (0, 0.1, 0.25, 3, 5, 12, 18, 28%), sales/purchase rates, min stock levels. |
| Units of Measure | `/masters/units` | `GET /masters/units`<br>`POST /masters/units`<br>`PUT /masters/units/:id`<br>`DELETE /masters/units/:id` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `UnitOfMeasure` | **PASS** | CRUD for symbols (NOS, KGS, BOX, MTR), unique symbol per company, decimal precision rules. |
| Categories | `/masters/categories` | `GET /masters/categories`<br>`POST /masters/categories`<br>`PUT /masters/categories/:id`<br>`DELETE /masters/categories/:id` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `ItemCategory` | **PASS** | Tree/flat hierarchical category organization for item classification. |
| Item Batches | `/masters/batches` | `GET /masters/batches`<br>`POST /masters/batches`<br>`PUT /masters/batches/:id` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `ItemBatch` | **PASS** | Batch numbers, manufacturing dates, expiry dates, MRP per batch. |
| Warehouses | `/masters/warehouses` | `GET /masters/warehouses`<br>`POST /masters/warehouses`<br>`PUT /masters/warehouses/:id` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `BRANCH_MANAGER`) | `Warehouse` | **PASS** | Multi-godown management, branch mapping, default warehouse flag. |
| **Double-Entry Accounting** | | | | | | |
| Chart of Accounts | `/accounting/chart-of-accounts` | `GET /accounting/chart-of-accounts`<br>`POST /accounting/ledgers` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `AccountGroup`, `LedgerAccount` | **PASS** | 5-head standard hierarchy (Assets, Liabilities, Equity, Revenue, Expenses), Gujarati subtitles, custom sub-ledger creation. |
| Ledger Accounts | `/accounting/ledgers` | `GET /accounting/ledgers`<br>`GET /accounting/ledgers/:id/entries` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `AUDITOR`) | `LedgerAccount`, `JournalEntry` | **PASS** | Account balances, DR/CR drill-down, running balance computation. |
| Voucher Register | `/accounting/vouchers` | `GET /accounting/vouchers` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `AUDITOR`) | `Voucher`, `JournalEntry` | **PASS** | Filter by voucher type (SALES, PURCHASE, RECEIPT, PAYMENT, JOURNAL, CONTRA), view balanced journal debits/credits. |
| New Voucher Entry | `/accounting/vouchers/new` | `POST /accounting/vouchers` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `Voucher`, `JournalEntry` | **PASS** | Manual double-entry journal entry with strict validation (total Dr == total Cr), reference numbering, date period lock validation. |
| **Purchases** | | | | | | |
| Purchase Bills | `/purchases` | `GET /purchases`<br>`POST /purchases`<br>`POST /purchases/payments` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `PurchaseInvoice`, `PurchasePaymentAllocation`, `StockTransaction`, `Voucher` | **FIXED** | Record supplier bill, input tax allocation (CGST/SGST/UTGST/IGST), stock inward. Fixed: Allowed supplier payments for parties originally created as CUSTOMER by promoting party type to BOTH. |
| Smart Bill Scanner | `/purchases/scanner` | `POST /purchases/scan`<br>`POST /purchases/scanner/confirm` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `PurchaseInvoice`, `Item` | **PASS** | Real OCR via Tesseract/PDF parsing, extraction of supplier GSTIN, items, tax breakdown, and draft creation. |
| Debit Notes / Returns | `/purchases/returns` | `GET /purchase-returns`<br>`POST /purchase-returns` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `PurchaseReturn`, `StockTransaction`, `Voucher` | **PASS** | Quantity verification against remaining bill quantity, stock deduction, reversal of Input GST, reduction of accounts payable. |
| **Inventory & Stock** | | | | | | |
| Stock Summary | `/inventory` | `GET /reports/stock-summary` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `BRANCH_MANAGER`) | `StockTransaction`, `Item` | **PASS** | On-hand quantity, Moving Weighted-Average Cost (WAC) valuation, min stock warning indicators. |
| Stock Movements | `/inventory/movements` | `GET /inventory/movements` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `BRANCH_MANAGER`) | `StockTransaction` | **PASS** | Immutable append-only stock audit trail (INWARD, OUTWARD, TRANSFER, ADJUSTMENT). |
| Stock Transfers | `/inventory/transfers` | `GET /stock-transfers`<br>`POST /stock-transfers` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `BRANCH_MANAGER`) | `StockTransfer`, `StockTransferItem` | **PASS** | Inter-warehouse transit with IN_TRANSIT status and variance tracking. |
| **Manufacturing** | | | | | | |
| Bills of Materials | `/manufacturing/boms` | `GET /manufacturing/boms`<br>`POST /manufacturing/boms` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `BillOfMaterial`, `BOMComponent` | **PASS** | Raw material recipes with consumption quantities and scrap percentages. |
| Production Orders | `/manufacturing/orders` | `GET /manufacturing/orders`<br>`POST /manufacturing/orders/:id/issue-materials`<br>`POST /manufacturing/orders/:id/record-yield` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `ProductionOrder`, `StockTransaction` | **PASS** | Converts raw material stock into finished goods stock with scrap accounting. |
| **GST Compliance** | | | | | | |
| GST Dashboard | `/gst` | `GET /gst/summary`<br>`GET /gst/compliance-status` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `AUDITOR`) | `SalesInvoice`, `PurchaseInvoice`, `GSTAuditLog` | **PASS** | Live tax liability vs Input Tax Credit summary based on internal posted vouchers. |
| GSTR-1 Summary | `/gst/gstr1` | `GET /reports/gstr1` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `AUDITOR`) | `SalesInvoice` | **PASS** | B2B, B2CL, B2CS, CDNR, Export, HSN summaries, Nil rated summaries. Shows draft status truthfully. |
| GSTR-3B Summary | `/gst/gstr3b` | `GET /reports/gstr3b` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `AUDITOR`) | `SalesInvoice`, `PurchaseInvoice` | **PASS** | Table 3.1 outward taxable supplies, Table 4 eligible ITC, Table 5 exempt/nil supplies, Table 6.1 tax payable. |
| GSTR-2B Recon | `/gst/gstr2b` | `POST /gst/gstr2b/import`<br>`GET /gst/gstr2b/recon` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `GSTR2BEntry`, `PurchaseInvoice` | **PASS** | Matches imported JSON with recorded purchase bills (MATCHED, MISMATCH, MISSING_IN_BOOKS, MISSING_IN_2B). |
| E-Way Bills | `/gst/eway-bills` | `GET /gst/eway-bills`<br>`POST /gst/eway-bills/generate` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `EWayBill` | **BLOCKED** | NIC portal integration requires official GSP client credentials & RSA encryption. Safely prevented from faking. |
| E-Invoices | `/gst/e-invoices` | `GET /gst/e-invoices`<br>`POST /gst/e-invoices/generate` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`) | `EInvoice` | **BLOCKED** | IRP portal direct submission requires live IRP credentials & HMAC signing. Explicitly reported without mocks. |
| **Reports** | | | | | | |
| Reports Hub | `/reports` | `GET /reports/sales-register`<br>`GET /reports/purchase-register`<br>`GET /reports/day-book`<br>`GET /reports/trial-balance`<br>`GET /reports/profit-loss`<br>`GET /reports/balance-sheet`<br>`GET /reports/cash-flow`<br>`GET /reports/aging-summary`<br>`GET /reports/party-ledger` | `RolesGuard` (`COMPANY_ADMIN`, `ACCOUNTANT`, `AUDITOR`) | All core transactional and accounting models | **FIXED** | Complete suite of financial and statutory reports. **Fixed**: Added Party Statement / Khata tab with opening balance, debits, credits, closing balance (Dr/Cr) and print support. |
| **Settings** | | | | | | |
| Company Settings | `/settings/company` | `GET /companies/current`<br>`PUT /companies/current` | `RolesGuard` (`COMPANY_ADMIN`, `ORG_ADMIN`) | `Company` | **PASS** | Legal name, Trade name, GSTIN, State, PAN, Address, Bank details, Invoice prefix settings. |
| Branch Settings | `/settings/branches` | `GET /branches`<br>`POST /branches`<br>`PUT /branches/:id` | `RolesGuard` (`COMPANY_ADMIN`, `ORG_ADMIN`) | `Branch` | **PASS** | Multi-branch configuration, branch code, address, GSTIN mapping. |
| Financial Years | `/settings/financial-years` | `GET /financial-years`<br>`POST /financial-years`<br>`POST /financial-years/:id/lock` | `RolesGuard` (`COMPANY_ADMIN`, `ORG_ADMIN`) | `FinancialYear` | **PASS** | Period management, lock enforcement preventing backdated postings. |

---

## 3. Master Data Business Functionality & Relationship Matrix

All master entities enforce foreign-key relationships, unique constraints per company, and deletion protection when referenced in posted transactions:

| Master Entity | Unique Constraints | Foreign Keys & Dependencies | Referential Action on Delete | Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| **HsnMaster** | `(code)` WHERE `company_id IS NULL` (global)<br>`(companyId, code)` WHERE `company_id IS NOT NULL` (company) | Optional `Company`, referenced by `Item`. | `RESTRICT` if referenced in `Item`. System codes protected from deletion/edit. | 2-8 numeric digits; string storage preserving leading zeros; standard GST slab (0, 0.1, 0.25, 3, 5, 12, 18, 28%). |
| **Party** | `(companyId, gstin)` (if provided) | Belongs to `Company`. | `RESTRICT` if referenced in `SalesInvoice` or `PurchaseInvoice`. | State code must match GSTIN prefix; PAN extracted from GSTIN; billing address mandatory. |
| **Item** | `(companyId, sku)` (if provided) | Belongs to `Company`, optional `UnitOfMeasure`, `ItemCategory`, `HsnMaster`. | `RESTRICT` if referenced in invoice/bill line items. | HSN 2-8 digits; tax rate must be standard GST slab (0, 0.1, 0.25, 3, 5, 12, 18, 28%). |
| **UnitOfMeasure** | `(companyId, symbol)` | Belongs to `Company`. | `RESTRICT` if referenced in `Item`. | Symbol max 10 chars, decimal places 0-4. |
| **ItemCategory** | `(companyId, name)` | Belongs to `Company`, optional parent `ItemCategory`. | `RESTRICT` if referenced in `Item`. | Name cannot be empty. |
| **ItemBatch** | `(itemId, batchNumber)` | Belongs to `Item`, `Company`. | `RESTRICT` if used in `StockTransaction`. | Batch number mandatory; expiry date must be after manufacturing date. |
| **Warehouse** | `(companyId, code)` | Belongs to `Company`, optional `Branch`. | `RESTRICT` if used in `StockTransaction`. | Default warehouse cannot be deleted while company is active. |
| **LedgerAccount** | `(companyId, code)` | Belongs to `AccountGroup`, `Company`. | `RESTRICT` if referenced in `JournalEntry`. | Immutability on system-seeded accounts (Cash, Bank, Debtors, Creditors, GST Input/Output). |

---

### 3.1 Centralized HSN/SAC Code Master Architecture & Migration Report

1. **Architecture & Scope Strategy:**
   - **Hybrid Centralized & Company Custom Design:** Official Indian GST tariff classifications are seeded as global system codes (`company_id IS NULL`), accessible read-only to all tenants. Companies can define their own custom HSN/SAC codes or overrides (`company_id = tenant.company_id`).
   - **PostgreSQL Row-Level Security (`RLS`):** Policy `hsn_masters_tenant_isolation` guarantees tenants can read global codes (`company_id IS NULL`) and their own company codes (`company_id = current_setting('app.current_company_id')`), while completely isolating custom records from other companies.
   - **Leading Zero Preservation:** All codes are stored as variable-length character strings (`VARCHAR(10)`) with a regex check constraint `(code ~ '^[0-9]{2,8}$')`, ensuring codes like `0902` (Tea) and `0401` (Milk) never lose their leading zeros.
   - **Statutory GST Rate Validation:** Check constraint `hsn_masters_gst_rate_check` enforces statutory Indian GST rate slabs: `0%`, `0.1%`, `0.25%`, `3%`, `5%`, `12%`, `18%`, and `28%`.
   - **Protection of Historical and Referenced Data:** Global system codes cannot be edited or deleted (`403 Forbidden`). Deleting any custom HSN code referenced by catalog items or transaction lines is blocked (`400 Bad Request: Cannot delete HSN code referenced by items`).

2. **Database Migration & Backfill:**
   - Migration file: `20261014190000_centralized_hsn_master/migration.sql`.
   - Seeded **49 verified official Indian GST HSN/SAC codes** covering agricultural commodities (e.g. `1001`, `1006`), textiles (`5208`, `6203`), metals (`7214`), machinery/electronics (`8471`, `8504`), and standard Chapter 99 service classifications (`998311` for Accounting, `998313` for IT Consulting, `998314` for Software, `998222` for Legal Services).
   - **Backfill Results on Existing Data:**
     - 48 out of 50 existing catalog items were automatically linked to their matching official master record (`items.hsn_master_id`).
     - **Unmapped Codes Report (2 items):**
       - Item `Cursor (Anysphere, Inc.) Subscription / Service` (`hsnCode: '0000'`): Retained string fallback (OCR unrecognized code placeholder from raw vendor invoice).
       - Item `Table` (`hsnCode: '393941'`): Retained string fallback (Custom user-entered code not in standard schedule).
     - Both unmapped items continue functioning seamlessly via string fallback without runtime errors or data truncation.

3. **Frontend Management & Module Integration:**
   - Dedicated management UI at `/masters/hsn` with search, type filter tabs (All, Goods/HSN, Services/SAC), active/inactive status filter, pagination, stat cards, and bilingual labels (English/Gujarati).
   - Reusable `HsnSelector` (`apps/web/src/components/ui/hsn-selector.tsx`) integrated into Items Catalog (`/masters/items`) create and edit modals with autocompletion and default GST rate population.
   - Preserves historical immutability on posted invoices, debit notes, credit notes, and GSTR summaries.

## 4. Accounting, Billing, Inventory & GST Integrity

1. **Strict Double-Entry Invariant:** Every voucher posted (`SALES`, `PURCHASE`, `RECEIPT`, `PAYMENT`, `JOURNAL`, `CONTRA`) enforces that `sum(Debits) == sum(Credits)`. Tested and verified across 27 test suites.
2. **Supplier Settlements:** `POST /purchases/payments` and `POST /purchases/:id/payments` execute atomic balance updates on `PurchaseInvoice.balanceAmount`, post balanced payment vouchers, and reject overpayments. Concurrent submissions serialize via advisory locks. Replayed idempotency keys safely return the original allocation.
3. **Customer Receipts:** Receipts validate invoice balance, post to Cash/Bank and Debtors control account, and update `SalesInvoice.balanceAmount`.
4. **Returns & Credit/Debit Notes:**
   - Sales returns check remaining quantity; reverse output tax (CGST/SGST/IGST/UTGST); restore inventory; and create credit vouchers. Excess returns over unpaid balance leave a customer credit balance rather than corrupting ledger math.
   - Purchase returns reverse input tax; deduct inventory; and reduce supplier liability.
5. **Inventory Valuation:** Truthfully documented and implemented as Moving Weighted-Average Cost (WAC). Stock transactions are strictly append-only.
6. **Statutory GST Status:**
   - GSTR-1, GSTR-3B, and GSTR-2B reconciliation operate on internal books and mark drafts as `NOT_FILED`.
   - Live NIC IRP E-Invoice and E-Way generation are gated under `BLOCKED_BY_EXTERNAL_CONFIGURATION` until production GSP credentials, public key certificates, and encryption keys are provided. No mock IRNs are fabricated in production.

---

### 4.1 Supplier Payment Dual-Role Fix Verification (Part B Audit)

1. **Previous Defect Background:**
   - A purchase bill for party `JKEnterprise` (vendor invoice `3445`) failed during settlement because `Party.type` was stored as `CUSTOMER`.
   - In standard Indian wholesale/retail commerce, many trade counterparts act as both customer and supplier (e.g. buying finished goods and supplying raw materials/packaging).
   - In commit `e61690c`, `purchases.service.ts` was updated so that when recording purchase bills or purchase payments for a valid counterparty originally entered as `CUSTOMER`, the party type is upgraded to `BOTH` instead of rejecting the transaction with `BadRequestException("Supplier payments require a supplier party.")`.

2. **Verification & Invariant Checks Performed:**
   - **Isolation & Targeted Scope:** Inspected the database to confirm only the intended party record was promoted. No unrelated customer or party records were altered.
   - **Customer Ledger & Receivables Safety:** Upgrading `Party.type` to `BOTH` does **not** alter existing customer invoices, customer receipts, or trade receivables. It merely authorizes the counterparty to participate in both accounts receivable and accounts payable accounting cycles.
   - **Double-Entry Balance & Vouchers:** Verified that supplier payments post balanced payment vouchers (`Debit: Creditors / Credit: Bank or Cash`).
   - **Idempotency & Concurrent Safety:** Verified that replayed idempotency keys return the existing allocation, and concurrent submissions serialize through PostgreSQL transaction locks without double-settling liabilities.
   - **Automated Regression Suite:** All 8 tests in `test/purchase-payments.integration.spec.ts` pass 100%, verifying partial settlement, full settlement, overpayment rejection, tenant isolation, locked financial-year protection, and the dual-role promotion mechanism.

---

## 5. Role & Permission Matrix (RBAC & RLS)

Based on enum `UserRole` in `packages/database/prisma/schema.prisma` and guards in `apps/api`:

| Module / Operation | SUPER_ADMIN | ORG_ADMIN | COMPANY_ADMIN | ACCOUNTANT | BRANCH_MANAGER | CASHIER | SALESMAN | AUDITOR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard & Reports** | Read | Read | Read | Read | Read | Read | Read | Read |
| **Sales Invoices (View)** | Full | Full | Full | Full | Branch | Branch | Branch | Read-Only |
| **Sales Invoices (Create/Edit)** | Full | Full | Full | Full | No | Yes (POS) | Yes | No (403) |
| **Sales Invoices (Cancel)** | Full | Full | Full | Full | No | No | No | No (403) |
| **Sales Returns / Credit Notes**| Full | Full | Full | Full | No | No | No | No (403) |
| **Purchase Bills & Payments** | Full | Full | Full | Full | No | No | No | No (403) |
| **Double-Entry Vouchers** | Full | Full | Full | Full | No | No | No | Read-Only |
| **Master Data (CRUD)** | Full | Full | Full | Full | No | No | No | Read-Only |
| **Inventory / Stock Transfers** | Full | Full | Full | Full | Branch | No | No | Read-Only |
| **Manufacturing (BOM/Orders)** | Full | Full | Full | Full | No | No | No | Read-Only |
| **GST Reconciliation & Tax** | Full | Full | Full | Full | No | No | No | Read-Only |
| **Financial Year (Locking)** | Full | Full | Full | No (403) | No | No | No | No (403) |
| **Company & Branch Settings** | Full | Full | Full | No (403) | No | No | No | No (403) |

**Tenant Isolation:** Enforced at database level via PostgreSQL Row-Level Security (`RLS`) policies and application-level `TenantContextGuard` checking `x-organization-id` and `x-company-id`. Verified in `tenant-isolation-rls.spec.ts`.

---

## 6. Responsive UI Audit & Device Verification

All web screens and components were audited across target viewports:

| Viewport Profile | Resolution (W × H) | Layout Adaptation & Components Verified | Status |
| :--- | :--- | :--- | :---: |
| **Compact Mobile** | 320 × 568 (iPhone SE 1) | Single column layout, modal padding adjusted to `px-4 py-3.5`, tables scroll horizontally within `overflow-x-auto` wrappers, sticky mobile header. | **PASS** |
| **Standard Mobile** | 360 × 800 (Android Standard) | Touch-friendly inputs, mobile drawer navigation, quick action cards stack vertically. | **PASS** |
| **Modern Mobile** | 390 × 844 (iPhone 12/13/14) | Crisp typography, Gujarati font rendering, full form field visibility, no clipped action buttons. | **PASS** |
| **Large Mobile** | 430 × 932 (iPhone 14/15 Pro Max)| Generous spacing, smooth touch transitions, full-screen drawer dismiss on backdrop tap. | **PASS** |
| **Tablet Portrait** | 768 × 1024 (iPad Mini / Air) | 2-column grid adaptation for dashboard KPI cards and form grids; collapsible sidebar toggle. | **PASS** |
| **Tablet Landscape**| 1024 × 768 & 1180 × 820 | Full sidebar visibility, side-by-side voucher entry lines, spacious report tables. | **PASS** |
| **Laptop** | 1366 × 768 & 1440 × 900 | Optimal desktop density, table column headers aligned with monetary right-alignment. | **PASS** |
| **Large Desktop** | 1920 × 1080 (FHD / Wide) | Max-width content boundaries (`max-w-7xl`), centered layouts, no stretched controls. | **PASS** |

### Responsive Fixes Implemented in this Session:
1. **Branch Selector in Mobile Drawer:** Added branch switching dropdown into the mobile navigation drawer (`apps/web/src/components/layout/app-shell.tsx`), matching the desktop header functionality.
2. **Mobile Modal Padding:** Reduced modal container padding on screens `< 640px` (`apps/web/src/components/ui/modal.tsx`) from `p-6` to `p-4 sm:p-6`, ensuring modal forms fit on 320px screens without header/footer clipping.
3. **Table Container Scrollers:** Audited all 43 tables in `apps/web/src/app/**`; all are enclosed within `overflow-x-auto` divs to prevent unintended document-level horizontal scroll.

---

## 7. Automated Test Suite Execution Results

Executed the full regression and security test suites on the workspace:

### Type Check Command:
```bash
pnpm run type-check
```
- **Outcome:** **10 / 10 package tasks successful**, 0 TypeScript errors across `@billing/web`, `@billing/api`, `@billing/database`, `@billing/accounting-core`, `@billing/gst-provider`, `@billing/shared-types`, and `@billing/tsconfig`.

### Backend API Test Suite:
```bash
pnpm --filter @billing/api test
```
- **Outcome:** **28 test files passed, 325 / 325 tests passed (100%)**, Duration: 31.57s.
- **Test Files Executed & Passed:**
  1. `test/accounting-reconciliation.spec.ts` (8 tests)
  2. `test/accounting.integration.spec.ts` (27 tests)
  3. `test/audit.hash-chain.spec.ts` (6 tests)
  4. `test/auth.security.spec.ts` (11 tests)
  5. `test/bill-scanner.integration.spec.ts` (7 tests)
  6. `test/bill-scanner.unit.spec.ts` (20 tests)
  7. `test/distribution-manufacturing-schema.spec.ts` (14 tests)
  8. `test/distribution.integration.spec.ts` (25 tests)
  9. `test/gst-compliance.integration.spec.ts` (4 tests)
  10. `test/gstin.validation.spec.ts` (8 tests)
  11. `test/health.spec.ts` (3 tests)
  12. `test/hsn.integration.spec.ts` (11 tests)
  13. `test/manufacturing.integration.spec.ts` (22 tests)
  14. `test/masters.integration.spec.ts` (26 tests)
  15. `test/phase5-audit.integration.spec.ts` (17 tests)
  16. `test/pilot-execution.spec.ts` (8 tests)
  17. `test/purchase-payments.integration.spec.ts` (8 tests)
  18. `test/purchase-returns.integration.spec.ts` (12 tests)
  19. `test/purchases.integration.spec.ts` (5 tests)
  20. `test/rate-limiting.security.spec.ts` (2 tests)
  21. `test/real-ocr-hardening.spec.ts` (8 tests)
  22. `test/reconciliation.integration.spec.ts` (14 tests)
  23. `test/reports.integration.spec.ts` (16 tests)
  24. `test/sales-invoices.integration.spec.ts` (22 tests)
  25. `test/sales-returns.integration.spec.ts` (9 tests)
  26. `test/staging-pilot-day1.spec.ts` (4 tests)
  27. `test/stock-valuation-reconciliation.spec.ts` (2 tests)
  28. `test/tenant-isolation-rls.spec.ts` (6 tests)

### Frontend Production Build:
```bash
pnpm --filter @billing/web build
```
- **Outcome:** **Compiled successfully**, 40 / 40 static and dynamic routes built cleanly without errors, including `/masters/hsn` (11.3 kB).

---

## 8. Database Migrations Status

- **Migration Applied:** `packages/database/prisma/migrations/20261014190000_centralized_hsn_master/migration.sql`.
  - Added enum `HsnType { HSN, SAC }`.
  - Added table `hsn_masters` with constraints for code format `^[0-9]{2,8}$` and statutory GST slabs `(0, 0.1, 0.25, 3, 5, 12, 18, 28)`.
  - Added foreign key `items.hsn_master_id` (`ON DELETE RESTRICT`).
  - Added PostgreSQL RLS policy `hsn_masters_tenant_isolation` allowing global system read and strict company isolation for custom codes.
  - Seeded 49 official Indian GST codes; automatically backfilled 48/50 existing catalog items.
- No destructive migrations or table resets were executed.
- Database schema matches Prisma schema `schema.prisma`.
- All tables enforce PostgreSQL Row-Level Security policies with tenant isolation.
- Existing business data was completely preserved.

---

## 9. Files Changed & Implementation Decisions

| Modified / Created File | Summary of Changes | Design Rationale |
| :--- | :--- | :--- |
| `packages/database/prisma/schema.prisma` | Added `HsnType` enum, `HsnMaster` model with composite unique indexes, and relation to `Item`. | Establishes centralized HSN/SAC master with string storage preserving leading zeros and tenant RLS. |
| `packages/database/prisma/migrations/20261014190000_centralized_hsn_master/` | Applied migration and initial seed data for 49 verified official Indian GST codes. | Safe non-destructive migration preserving existing database records and tenant isolation. |
| `packages/shared-types/src/index.ts` | Exported `HsnType` enum. | Unified types across frontend and backend monorepo workspaces. |
| `apps/api/src/hsn/` | Created `HsnModule`, `HsnController`, `HsnService`, and DTOs (`create-hsn`, `update-hsn`, `query-hsn`). | Robust CRUD, search autocompletion, rate validation, system code protection, and delete restriction for referenced codes. |
| `apps/api/src/items/` | Updated `create-item.dto.ts`, `update-item.dto.ts`, and `items.service.ts` to support `hsnMasterId` and auto-lookup. | Connects item catalog directly to centralized HSN master. |
| `apps/api/test/hsn.integration.spec.ts` | Created full integration test suite with 11 test cases covering search, CRUD, RLS isolation, format validation, and delete constraints. | Comprehensive test coverage ensuring zero regressions. |
| `apps/web/src/components/ui/hsn-selector.tsx` | Created searchable HSN autocomplete dropdown with type badge, GST rate indicator, and official GST shield icon. | Replaces free-text input with searchable, validated master selection while maintaining string fallback. |
| `apps/web/src/app/masters/hsn/page.tsx` | Created full-featured HSN/SAC master management screen with search, type tabs, active status toggle, add/edit/view modals, and bilingual labels. | Complete master data management for Indian businesses. |
| `apps/web/src/components/layout/app-shell.tsx` | Added "HSN / SAC Codes" (`એચએસએન કોડ`) to sidebar navigation under Master Data. | Discoverable frontend access for accountants and administrators. |
| `apps/web/src/app/masters/items/page.tsx` | Replaced plain text input with `HsnSelector` in both Create and Edit modals; auto-fills default tax rate and sets type to `SERVICE` when SAC selected. | Seamless user experience and tax calculation consistency. |
| `apps/api/src/purchases/purchases.service.ts` | Auto-promote party type to `BOTH` in `createPurchase` and `recordPurchasePayment` instead of throwing `BadRequestException`. | Verified in Part B: allows businesses to settle purchase bills when parties were initially created as `CUSTOMER`, reflecting real Indian dual-role trade. |
| `apps/api/test/purchase-payments.integration.spec.ts` | Added integration test for settling purchase bills for parties created as `CUSTOMER` and verifying promotion to `BOTH`. | Protects supplier payment workflow from regression. |
| `docs/project-functionality-audit.md` | Documented HSN/SAC master architecture, supplier payment verification, unmapped codes report, and updated test results. | Complete transparency and audit trail. |

---

## 10. Remaining Blockers & Next Actions

1. **NIC E-Way & E-Invoice Production Credentials (External Dependency):**
   - Live portal submission remains `BLOCKED_BY_EXTERNAL_CONFIGURATION` until an official GSP agreement, client credentials, and production encryption certificates are provided. Internal business workflows and draft exports are fully operational.
2. **Superadmin Scope Boundary:**
   - As per strict instructions, **Superadmin development has NOT been started** and will only begin after your explicit approval of this audit and acceptance report.
