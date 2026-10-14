# 03 — System Architecture & End-to-End Data Flow

> **Audit Date:** October 14, 2026  
> **Repository:** `my_bill_history`  
> **Architecture Pattern:** Multi-Tenant Modular Monolith with Decoupled Next.js Frontend & NestJS Backend

---

## 1. High-Level Architectural Blueprint

The platform separates presentation, statutory business logic, and transactional persistence into clear, type-safe tiers orchestrated via pnpm workspaces:

```mermaid
graph TD
    subgraph ClientTier["Client Presentation Tier (apps/web)"]
        Browser["Desktop & Mobile Browsers / PWA"]
        AppShell["AppShell (Responsive Layout & Bilingual Toggle)"]
        AuthCtx["AuthContext (JWT, Active Tenant & FY State)"]
        ApiClient["apiClient (HTTP Fetch + Injected Tenant Headers)"]
    end

    subgraph ApiGateway["API Gateway & Services (apps/api - Fastify)"]
        FastifyServer["Fastify Server (Port 4000)"]
        TenantInterceptor["TenantContextInterceptor (Resolves Org, Company, Branch, FY)"]
        JwtGuard["JwtAuthGuard & RolesGuard"]
        Modules["NestJS Feature Modules (Invoices, Purchases, Vouchers, GST, Masters)"]
        DbService["DatabaseService (Prisma Wrapper + RLS Session Setup)"]
    end

    subgraph CoreLibraries["Core Business Domain Packages"]
        AcctCore["@billing/accounting-core (Zero-Sum Invariants, AS-2 Moving Avg)"]
        GstProv["@billing/gst-provider (NIC e-Way, e-Invoice, AES-256 Secret Box)"]
        SharedTypes["@billing/shared-types (Enums, Contracts, DTOs)"]
    end

    subgraph Persistence["Persistence & Infrastructure Tier"]
        Postgres[("PostgreSQL 16/18 with Row-Level Security")]
        RedisCache[("Redis 7 (BullMQ & Fast Cache)")]
        LocalDisk[("File Storage (apps/api/storage/bill-scans)")]
    end

    Browser --> AppShell
    AppShell --> AuthCtx
    AuthCtx --> ApiClient
    ApiClient -->|"HTTP /api/v1 (Bearer JWT + x-org-id)"| FastifyServer
    FastifyServer --> TenantInterceptor
    TenantInterceptor --> JwtGuard
    JwtGuard --> Modules
    Modules --> AcctCore
    Modules --> GstProv
    Modules --> DbService
    DbService -->|"SET LOCAL app.current_organization_id"| Postgres
    Modules --> RedisCache
    Modules --> LocalDisk
```

---

## 2. Authentication & Multi-Tenant Context Resolution Flow

Every user belongs to an **Organization**. Inside an Organization, there can be multiple legal **Companies** (with different GSTINs) and multiple **Branches** (warehouses/outlets). All operations occur inside an active **Financial Year**.

```mermaid
sequenceDiagram
    autonumber
    actor User as Cashier / Accountant
    participant Web as Next.js Client (LoginPage)
    participant AuthApi as /api/v1/auth/login
    participant DB as PostgreSQL (users, tenants, branches)
    participant Storage as localStorage

    User->>Web: Enter Phone (9898990001) + Password
    Web->>AuthApi: POST /auth/login { phone, password }
    AuthApi->>DB: Query User with Organization & Tenant
    DB-->>AuthApi: User record + passwordHash
    AuthApi->>AuthApi: bcrypt.compare(password, passwordHash)
    AuthApi->>AuthApi: Sign JWT (sub: userId, orgId, role, lang)
    AuthApi-->>Web: { accessToken, user, defaultContext: { orgId, companyId, branchId, fyId } }
    Web->>Storage: Store billing_auth_token & billing_tenant_context
    Web->>Web: Router redirects to Dashboard (/)
```

---

## 3. Invoice Creation & Double-Entry Ledger Posting Flow

This is the most critical business workflow. When a sales invoice is created, it atomically updates:
1. Sales Invoice and line items.
2. Item physical stock and batch balances.
3. Customer accounts receivable ledger.
4. Output GST tax liability ledgers (CGST, SGST, IGST).
5. Sales Revenue ledger.
6. Cash or Bank ledger (if paid immediately).
7. General Ledger Double-Entry Voucher (`VOUCHER_TYPE: SALES`).

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Store Cashier
    participant UI as NewSalesInvoicePage
    participant Api as /api/v1/invoices
    participant Acct as @billing/accounting-core
    participant DB as PostgreSQL (Atomic Transaction)

    Cashier->>UI: Select Customer, Add Items, Tax Rate, Discount
    UI->>UI: Real-time UI calculation (Subtotal, GST Split, Roundoff)
    Cashier->>UI: Click "Save & Print"
    UI->>Api: POST /invoices { customerId, items, paymentMode, isPaid }
    Api->>Api: Verify Active Financial Year is NOT locked
    Api->>Acct: calculateGstSplit() & computeLineTaxes()
    Api->>DB: BEGIN TRANSACTION (SET LOCAL app.current_organization_id)
    Api->>DB: Generate Sequential Invoice Number (INV-2026-0001)
    Api->>DB: INSERT INTO sales_invoices & sales_invoice_items
    Api->>DB: UPDATE items & item_batches (Deduct stock: stockQty = stockQty - soldQty)
    Api->>DB: INSERT INTO stock_transactions (Type: SALES_OUTWARD)
    Api->>DB: INSERT INTO vouchers (Type: SALES)
    Api->>DB: INSERT INTO journal_entries (Customer Dr, Sales Cr, CGST Cr, SGST Cr)
    Api->>Acct: assertVoucherBalanced(journalEntries) [Sum Dr - Sum Cr = 0.00]
    Api->>DB: COMMIT TRANSACTION
    Api-->>UI: { invoiceId, invoiceNumber, grandTotal, voucherId }
    UI->>Cashier: Open Print Preview / A4 PDF
```

---

## 4. Product Inventory & Moving-Average Cost Valuation Flow

When goods arrive via a Purchase Invoice:
1. Vendor invoice details and line items are stored.
2. Inward stock transactions are created.
3. Item current stock quantity is increased.
4. The item's moving weighted average cost is recomputed under **Indian Accounting Standard 2 (AS-2)**:
   $$\bar{C}_{\text{new}} = \frac{(Q_{\text{current}} \times C_{\text{current}}) + (Q_{\text{inward}} \times C_{\text{inward}})}{Q_{\text{current}} + Q_{\text{inward}}}$$

```mermaid
flowchart TD
    Start([Inward Purchase Bill Recorded]) --> FetchCurrent[Fetch Current Stock Qty & Avg Cost]
    FetchCurrent --> CalcCost[Compute New Weighted Average Unit Cost via Decimal.js]
    CalcCost --> UpdateMaster[Update Item: stockQuantity += qty, purchasePrice = newAvgCost]
    UpdateMaster --> CreateBatch{Has Batch / Expiry?}
    CreateBatch -- Yes --> UpsertBatch[Insert / Update item_batches with Mfg/Exp dates]
    CreateBatch -- No --> LogTxn[Insert stock_transactions: PURCHASE_INWARD]
    UpsertBatch --> LogTxn
    LogTxn --> PostGL[Post Double-Entry Voucher: Purchase Dr, Creditor Cr, Input Tax Dr]
    PostGL --> End([Stock & Ledger Updated Synchronously])
```

---

## 5. Entity-Relationship Data Model (Core Domain Architecture)

The following diagram illustrates the relationship between the central tables in `packages/database/prisma/schema.prisma`:

```mermaid
erDiagram
    TENANT ||--o{ ORGANIZATION : owns
    ORGANIZATION ||--o{ COMPANY : contains
    COMPANY ||--o{ BRANCH : operates
    COMPANY ||--o{ FINANCIAL_YEAR : defines
    ORGANIZATION ||--o{ USER : employs
    COMPANY ||--o{ LEDGER_ACCOUNT : maintains
    COMPANY ||--o{ PARTY : transacts_with
    COMPANY ||--o{ ITEM : catalogs

    PARTY ||--o{ SALES_INVOICE : billed_to
    PARTY ||--o{ PURCHASE_INVOICE : supplied_by
    BRANCH ||--o{ SALES_INVOICE : issues
    BRANCH ||--o{ PURCHASE_INVOICE : receives

    SALES_INVOICE ||--|{ SALES_INVOICE_ITEM : includes
    PURCHASE_INVOICE ||--|{ PURCHASE_INVOICE_ITEM : includes

    ITEM ||--o{ SALES_INVOICE_ITEM : referenced_in
    ITEM ||--o{ PURCHASE_INVOICE_ITEM : referenced_in
    ITEM ||--o{ ITEM_BATCH : tracked_in
    ITEM ||--o{ STOCK_TRANSACTION : affected_by

    COMPANY ||--o{ VOUCHER : records
    VOUCHER ||--|{ JOURNAL_ENTRY : debits_credits
    LEDGER_ACCOUNT ||--o{ JOURNAL_ENTRY : balances
```

---

## 6. Security & Multi-Tenancy Execution Architecture

The system avoids accidental cross-tenant data leaks through a two-layer defense mechanism:

1. **Application-Level Context Injection:**
   The `TenantContextInterceptor` reads the active `x-organization-id` header (validated against the user's signed JWT token) and attaches it to `req.tenantContext`.

2. **Database-Level Row-Level Security (RLS):**
   In `apps/api/src/database/database.service.ts`, queries run inside an interactive transaction:
   ```typescript
   await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${ctx.organizationId}, true)`;
   await tx.$executeRawUnsafe(`SET LOCAL ROLE billing_app`);
   ```
   PostgreSQL executes the query under role `billing_app` (non-superuser), evaluating the table's RLS policy:
   ```sql
   CREATE POLICY tenant_isolation_policy ON sales_invoices
   FOR ALL TO billing_app
   USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
   ```
   Even if an engineer writes `SELECT * FROM sales_invoices` without a `where` clause, PostgreSQL physically filters out all rows belonging to other tenants.
