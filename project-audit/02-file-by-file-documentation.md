# 02 — Comprehensive File-by-File Technical Documentation Catalogue

> **Audit Date:** October 14, 2026  
> **Scope:** Complete source file audit across `apps/web`, `apps/api`, `packages/*`, and root configurations.

---

## Section 1: Application Routes & Pages (`apps/web/src/app`)

### 1.1 `apps/web/src/app/page.tsx`
- **File Type:** Next.js Server/Client Component (`page.tsx`)
- **Main Purpose:** Core Executive & Cashier Dashboard for daily business operations.
- **Main Components / Exports:** `default function DashboardPage()`
- **Key Dependencies:** `lucide-react`, `../context/auth-context`, `../lib/api-client`, `../components/ui/stat-card`, `../components/ui/badge`
- **Called By:** Next.js App Router for root path `/`.
- **Feature Supported:** Business health overview, daily sales counter, recent invoices, cash/bank balances, low stock alerts.
- **Implementation Status:** `ACTIVE / IMPLEMENTED`.
- **Risks & Bugs:** Queries multiple endpoints in sequence on mount (`/reports/dashboard`, `/sales/invoices`, `/items/low-stock`). If any single endpoint throws, error boundaries must catch gracefully rather than freezing the screen.
- **Recommended Action:** Implement `Promise.allSettled` for widget resiliency so dashboard loads partially if one module is slow.

---

### 1.2 `apps/web/src/app/login/page.tsx`
- **File Type:** Next.js Client Component (`"use client"`)
- **Main Purpose:** Authentication screen with phone number and password, with dual English/Gujarati localization.
- **Main Components / Exports:** `default function LoginPage()`
- **Key Dependencies:** `../context/auth-context`, `../lib/api-client`, `next/navigation`
- **Called By:** Next.js Router for `/login`. Unauthenticated redirects from `api-client.ts`.
- **Feature Supported:** Tenant login, session establishment, demo user auto-fill.
- **Implementation Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.
- **Risks & Bugs:** Demo credentials button is visible when `NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS="true"`. Must be strictly disabled in production builds.
- **Recommended Action:** Keep demo helper enabled in local development only.

---

### 1.3 `apps/web/src/app/sales/invoices/page.tsx`
- **File Type:** Next.js Client Component (`"use client"`)
- **Main Purpose:** Sales Invoices Register. Lists all tax and retail invoices with pagination, filtering, status badges, and action dropdowns.
- **Main Components / Exports:** `default function SalesInvoicesPage()`
- **Key Dependencies:** `../lib/api-client`, `../context/auth-context`, `../components/ui/badge`
- **Called By:** Next.js Router for `/sales/invoices`. Navigation menu.
- **Feature Supported:** Tax invoice tracking, status filtering (DRAFT, ISSUED, PAID, PARTIAL, CANCELLED), payment reconciliation, PDF download link.
- **Implementation Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.
- **Risks & Bugs:** Client-side filtering across large invoice lists (>10,000 invoices) can slow down the browser if backend pagination query parameters are not strictly bounded.
- **Recommended Action:** Enforce server-side pagination with default `limit=25` and quick date range shortcuts (Today, Yesterday, This Month).

---

### 1.4 `apps/web/src/app/sales/invoices/new/page.tsx`
- **File Type:** Next.js Client Component (`"use client"`)
- **Main Purpose:** Invoice Creation Form. Allows cashiers and accountants to generate statutory GST invoices.
- **Main Components / Exports:** `default function NewSalesInvoicePage()`
- **Key Dependencies:** `../lib/api-client`, `../context/auth-context`, `@billing/shared-types`
- **Called By:** Next.js Router for `/sales/invoices/new`. Quick bill button on dashboard.
- **Feature Supported:** Customer selection, item line addition, HSN auto-fill, GST rate dropdown (0%, 5%, 12%, 18%, 28%), quantity, rate, discount %, taxable amount, CGST/SGST/IGST automatic split, invoice round-off, cash/credit terms.
- **Implementation Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.
- **Risks & Bugs:** Line calculation uses standard JavaScript floating point arithmetic in the browser before sending to the backend. While the backend recalculates using Decimal, discrepancy can cause minor visual penny differences ($\pm ₹0.01$) before submission.
- **Recommended Action:** Import `@billing/accounting-core` calculation logic into the frontend form calculation helper to guarantee 100% penny parity before submit.

---

### 1.5 `apps/web/src/app/sales/invoices/[id]/page.tsx`
- **File Type:** Next.js Client Component (`"use client"`)
- **Main Purpose:** Invoice Detail, View, Print, and Statutory Generation View.
- **Main Components / Exports:** `default function InvoiceDetailPage()`
- **Key Dependencies:** `../lib/api-client`, `../context/auth-context`, `next/navigation`
- **Called By:** Next.js Router for dynamic route `/sales/invoices/:id`.
- **Feature Supported:** Printable invoice layout, e-Way Bill generation trigger, e-Invoice IRN trigger, PDF generation, voucher journal entries inspect.
- **Implementation Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.
- **Risks & Bugs:** Print style sheet (`@media print`) is optimized for A4 size. When printed on 58mm/80mm thermal receipt roll, CSS margins overflow.
- **Recommended Action:** Add a toggle button for "Thermal Receipt (POS)" format vs "A4 Tax Invoice" format.

---

### 1.6 `apps/web/src/app/sales/pos/page.tsx`
- **File Type:** Next.js Client Component (`"use client"`)
- **Main Purpose:** High-Speed Point of Sale (POS) Counter Billing.
- **Main Components / Exports:** `default function PosBillingPage()`
- **Key Dependencies:** `../lib/api-client`, `../context/auth-context`
- **Called By:** Next.js Router for `/sales/pos`. Cashier terminal shortcut.
- **Feature Supported:** Barcode scanner input listener, fast keyboard shortcuts (`F2` - Add Item, `F4` - Cash Tender, `Enter` - Save & Print), quick customer phone search, quick cash calculation.
- **Implementation Status:** `ACTIVE / IMPLEMENTED`.
- **Risks & Bugs:** Lacks an offline fallback queue. If the internet connection drops momentarily at the store counter, checkout fails.
- **Recommended Action:** Integrate an IndexedDB offline queue that queues pending bills locally and automatically syncs when network returns.

---

### 1.7 `apps/web/src/app/sales/returns/page.tsx`
- **File Type:** Next.js Client Component (`"use client"`)
- **Main Purpose:** Sales Returns & Customer Credit Notes.
- **Main Components / Exports:** `default function SalesReturnsPage()`
- **Key Dependencies:** `../lib/api-client`, `../context/auth-context`
- **Called By:** Next.js Router for `/sales/returns`.
- **Feature Supported:** Credit note generation against original invoice, inventory return to godown, reverse GST calculation, customer credit balance update.
- **Implementation Status:** `ACTIVE / IMPLEMENTED`.

---

### 1.8 `apps/web/src/app/purchases/page.tsx` & `components/bill-scanner-modal.tsx`
- **File Type:** Next.js Client Component (`"use client"`)
- **Main Purpose:** Inward Purchase Register and AI/OCR Smart Purchase Scanner.
- **Main Components / Exports:** `default function PurchasesPage()`, `BillScannerModal`
- **Key Dependencies:** `../lib/api-client`, `../context/auth-context`
- **Called By:** Next.js Router for `/purchases`.
- **Feature Supported:** Vendor bill entry, photo capture/upload of paper bills, automatic extraction of Vendor Name, GSTIN, Invoice No, Date, Line Items, and Totals via backend OCR service.
- **Implementation Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.
- **Risks & Bugs:** Large image uploads over slow mobile connections (2G/3G) can time out if image compression is not performed client-side before POST.
- **Recommended Action:** Add canvas-based client-side image downscaling to max 1920x1080 before upload.

---

### 1.9 `apps/web/src/app/masters/items/page.tsx` & `parties/page.tsx`
- **File Type:** Next.js Client Components
- **Main Purpose:** Core Master Data Catalogs for Inventory and CRM.
- **Main Components / Exports:** `ItemsMasterPage()`, `PartiesMasterPage()`
- **Key Dependencies:** `../lib/api-client`, `../context/auth-context`, `@billing/shared-types`
- **Called By:** Topbar / Sidebar masters menu.
- **Feature Supported:** Item creation with SKU, HSN, Tax Rate, Cost Price, Selling Price, Minimum Stock Alert; Customer/Supplier creation with GSTIN, PAN, Phone, Address, Credit Limit, and Opening Balance.
- **Implementation Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.

---

### 1.10 `apps/web/src/app/finance/ledgers/page.tsx`, `vouchers/page.tsx`, `expenses/page.tsx`
- **File Type:** Next.js Client Components
- **Main Purpose:** Double-Entry Bookkeeping and Cash/Bank Management.
- **Main Components / Exports:** `LedgersPage()`, `VouchersPage()`, `ExpensesPage()`
- **Feature Supported:** General Ledger drill-down, cash book (*Rojmel*), daily expense vouchers, contra vouchers (Cash Deposit/Withdrawal), customer receipt vouchers.
- **Implementation Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.

---

### 1.11 `apps/web/src/app/gst/page.tsx`
- **File Type:** Next.js Client Component
- **Main Purpose:** Statutory GST Compliance Dashboard.
- **Main Components / Exports:** `GstCompliancePage()`
- **Feature Supported:** GSTR-1 outward tax liability breakdown by rate bucket, GSTR-3B summary, GSTR-2B JSON import and reconciliation, live Sandbox status ping.
- **Implementation Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.

---

## Section 2: Layouts & Navigation (`apps/web/src/components`)

### 2.1 `apps/web/src/components/layout/app-shell.tsx`
- **File Type:** React Client Component
- **Main Purpose:** Global Application Shell wrapper providing responsive navigation, company switcher, branch switcher, and bilingual language toggling.
- **Key Exports:** `AppShell({ children }: { children: React.ReactNode })`
- **Key Features:** Collapsible sidebar, topbar with active Financial Year indicator, instant English $\leftrightarrow$ Gujarati switch, user profile dropdown, and logout trigger.
- **Status:** `ACTIVE / EXCELLENT DESIGN`.

### 2.2 `apps/web/src/components/pwa-register.tsx`
- **File Type:** React Client Component
- **Main Purpose:** Registers the Progressive Web App (PWA) service worker on browser mount.
- **Key Exports:** `PwaRegister()`
- **Status:** `ACTIVE`.

### 2.3 `apps/web/src/components/gst/gst-kit.tsx`
- **File Type:** Reusable UI Library Component
- **Main Purpose:** Reusable statutory GST UI widgets (tax pill badges, GSTIN validator pill, HSN tag).
- **Key Exports:** `GstStatusBadge`, `GstinValidationBadge`, `TaxBreakdownCard`
- **Status:** `ACTIVE`.

---

## Section 3: Frontend Infrastructure & State (`apps/web/src/lib` & `context`)

### 3.1 `apps/web/src/context/auth-context.tsx`
- **File Type:** React Context Provider
- **Main Purpose:** Manages user session, JWT tokens, tenant hierarchy (Organization, Company, Branch, Financial Year), and bilingual preference in local storage.
- **Key Exports:** `AuthProvider`, `useAuth()`
- **Key Methods:** `login()`, `logout()`, `switchCompany()`, `switchBranch()`, `switchFinancialYear()`, `setLang()`
- **Status:** `ACTIVE / SOLID ARCHITECTURE`.

### 3.2 `apps/web/src/lib/api-client.ts`
- **File Type:** Central HTTP API Client
- **Main Purpose:** Type-safe fetch wrapper that automatically injects tenant headers (`x-organization-id`, `x-company-id`, `x-branch-id`, `x-financial-year-id`), JWT Bearer tokens, and handles Gujarati localized error messages from the backend.
- **Key Exports:** `apiClient`, `ApiError`, `extractList`
- **Status:** `ACTIVE / VERIFIED`.

---

## Section 4: Backend Microservice (`apps/api/src`)

### 4.1 `apps/api/src/main.ts`
- **File Type:** Application Entrypoint
- **Main Purpose:** Bootstraps Fastify server on port 4000, configures CORS origins, global ValidationPipe, multipart file streaming, and production security guards (JWT secret strength, database URL checks).
- **Status:** `ACTIVE / VERIFIED`.

### 4.2 `apps/api/src/app.module.ts`
- **File Type:** Root NestJS Module
- **Main Purpose:** Registers 20 feature modules and establishes global application interceptors (Correlation ID, Tenant Context), global guards (Throttler rate limit, JWT Auth, Role Guard), and global exception filter (`HttpExceptionFilter`).
- **Status:** `ACTIVE / CLEAN ARCHITECTURE`.

### 4.3 `apps/api/src/database/database.service.ts`
- **File Type:** Core Database Provider
- **Main Purpose:** Wraps PrismaClient with tenant-scoped transactions that inject PostgreSQL Row-Level Security session variables:
  - `SET LOCAL app.current_organization_id = :orgId`
  - `SET LOCAL app.current_company_id = :companyId`
  - `SET LOCAL ROLE billing_app`
- **Key Methods:** `executeInTenantContext()`, `executeBypassRls()`
- **Status:** `ACTIVE / VERIFIED HIGH SECURITY`.

### 4.4 `apps/api/src/invoices/invoices.service.ts` & `invoices.controller.ts`
- **File Type:** Sales Billing Business Service & Controller
- **Main Purpose:** Generates sales invoices, computes GST taxes, assigns sequential invoice numbers based on financial year patterns, creates stock deduction transactions, posts double-entry vouchers to General Ledger, and generates PDF receipts.
- **Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.

### 4.5 `apps/api/src/purchases/purchases.service.ts` & `bill-scanner.service.ts`
- **File Type:** Inward Supply & OCR Service
- **Main Purpose:** Inward invoice entry, OCR text extraction via Tesseract.js / Gemini Vision, regex-based parsing of GST invoices, stock addition, and creditor ledger voucher posting.
- **Status:** `ACTIVE / IMPLEMENTED AND VERIFIED`.

### 4.6 `apps/api/src/vouchers/vouchers.service.ts`
- **File Type:** Double-Entry General Ledger Voucher Engine
- **Main Purpose:** Atomic creation of multi-line journal entries with validation: $\sum \text{Debit} - \sum \text{Credit} = 0.00$. Handles Voucher Types: `SALES`, `PURCHASE`, `PAYMENT`, `RECEIPT`, `CONTRA`, `JOURNAL`, `DEBIT_NOTE`, `CREDIT_NOTE`.
- **Status:** `ACTIVE / VERIFIED`.

### 4.7 `apps/api/src/reports/reports.service.ts`
- **File Type:** Financial & Statutory Reporting Engine
- **Main Purpose:** Aggregates General Ledger entries into Trial Balance, Balance Sheet, Profit & Loss, GSTR-1, GSTR-3B, and Stock Valuation reports.
- **Status:** `ACTIVE / VERIFIED`.

### 4.8 `apps/api/src/gst/gstr2b.service.ts` & `gst-portal.service.ts`
- **File Type:** Statutory Compliance Integration Services
- **Main Purpose:** Parses government GSTR-2B JSON payloads, reconciles them with purchase invoices, flags discrepancies, and manages NIC e-Invoice / e-Way Bill communications.
- **Status:** `ACTIVE / VERIFIED`.

### 4.9 `apps/api/src/manufacturing/production-orders.service.ts` & `boms.service.ts`
- **File Type:** Industrial SME Manufacturing Logic
- **Main Purpose:** Bill of Materials definition, production batch scheduling, automated raw material inventory deduction, and finished goods batch creation with unit costing.
- **Status:** `ACTIVE / VERIFIED`.

### 4.10 `apps/api/src/distribution/stock-transfers.service.ts` & `delivery-challans.service.ts`
- **File Type:** Multi-Location Warehouse Logistics
- **Main Purpose:** Inter-warehouse stock transfers, in-transit stock ledger tracking, goods dispatch and receipt reconciliation, delivery challan generation under Rule 55 of CGST Rules.
- **Status:** `ACTIVE / VERIFIED`.

---

## Section 5: Shared Core Domain Packages (`packages/*`)

### 5.1 `packages/accounting-core/src/tax-calculator.ts`
- **Main Purpose:** Statutory Indian GST tax calculation engine.
- **Exports:** `calculateGstSplit()`, `computeLineTaxes()`
- **Features:** Accurately calculates CGST (50%), SGST (50%) for intra-state supplies, IGST (100%) for interstate supplies, and handles reverse-charge transactions.

### 5.2 `packages/accounting-core/src/balance-invariants.ts`
- **Main Purpose:** Invariant assertion library for accounting data integrity.
- **Exports:** `assertVoucherBalanced()`, `verifyTrialBalance()`
- **Features:** Guarantees zero-penny imbalance across all journal entries.

### 5.3 `packages/accounting-core/src/moving-average.ts`
- **Main Purpose:** Real-time perpetual inventory valuation under Indian Accounting Standard 2 (AS-2).
- **Exports:** `computeWeightedAverageRate()`
- **Features:** Computes new moving unit cost whenever a purchase invoice or production receipt is recorded.

### 5.4 `packages/database/prisma/schema.prisma`
- **Main Purpose:** Declarative PostgreSQL Schema.
- **Models (52):** `Tenant`, `Organization`, `Company`, `Branch`, `Warehouse`, `User`, `UserBranchAssignment`, `AuditLog`, `FinancialYear`, `LedgerGroup`, `LedgerAccount`, `Voucher`, `JournalEntry`, `ItemCategory`, `UnitOfMeasure`, `Item`, `ItemBatch`, `StockTransaction`, `Party`, `SalesInvoice`, `SalesInvoiceItem`, `SalesReturn`, `SalesReturnItem`, `PurchaseInvoice`, `PurchaseInvoiceItem`, `PurchaseReturn`, `PurchaseReturnItem`, `PurchaseBillScan`, `PaymentAllocation`, `DeliveryChallan`, `DeliveryChallanItem`, `StockTransfer`, `StockTransferItem`, `BillOfMaterial`, `BomItem`, `ProductionOrder`, `ProductionBatch`, `Gstr2bImport`, `Gstr2bLine`, `Gstr2bReconciliation`, `Gstr2bAdjustment`, `EinvoiceRecord`, `EwayBillRecord`, `GstIntegrationConfig`, `GstApiAuditLog`, `PosSession`, `InvoiceSequence`, `AdvanceReceipt`, `AdvanceAdjustment`, `OutwardDebitNote`, `OutwardDebitNoteItem`, `_prisma_migrations`.
- **Status:** `ACTIVE / 100% POSTGRESQL 16/18 COMPLIANT`.

### 5.5 `packages/gst-provider/src/secret-box.ts`
- **Main Purpose:** Authenticated cryptographic vault for sensitive statutory secrets.
- **Exports:** `encryptSecret()`, `decryptSecret()`
- **Features:** Uses AES-256-GCM with randomly generated IVs to protect government API credentials at rest.
