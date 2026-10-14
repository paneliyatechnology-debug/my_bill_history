# Production Readiness Audit Report — Indian Billing & Accounting SaaS

**Project:** `/home/dell/Jaydeep/Billing`  
**Date:** October 12, 2026  
**Auditor:** Independent Technical & Architectural QA  
**Scope:** Phases 1 through 6 (Tenancy, Master Data, Double-Entry Accounting, Sales Billing, POS Engine, Stock Ledger, Financial Reports & GST Return Preparation).  
**Strict Scope Rule:** No Phase 7+ features (Procurement, BOM, Manufacturing, Live GSP upload) implemented or started.

---

## 1. Executive Summary & Production Readiness Verdict

### Overall Verdict: **CONDITIONALLY READY FOR STAGING / CONTROLLED PILOT**

The platform has established a robust, mathematically sound, and secure core foundation across Phases 1 through 6:

- **Relational Integrity & PostgreSQL RLS**: 100% of tenant-owned tables enforce PostgreSQL Row-Level Security (`ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`). Zero-trust authorization in NestJS interceptors verifies JWT organization claims, company membership, and branch assignments.
- **Double-Entry Accounting Invariants**: Every posted financial voucher enforces zero-sum debit/credit balance ($\sum \text{Dr} - \sum \text{Cr} = 0.00$) in exact 2-decimal Decimal math, with fractional pennies allocated to the statutory Round Off Account. Unbalanced vouchers are rejected by the database and API.
- **Single-Source Stock Ledger**: Physical stock changes write exclusively to an append-only `stock_transactions` ledger; arbitrary mutable stock counters are strictly prohibited.
- **Concurrency & Sequence Allocation**: Advisory locks (`pg_advisory_xact_lock`) protect invoice sequence allocation per `(company_id, financial_year_id)` and prevent duplicate sequence numbers or race-condition overpayments.
- **Multi-Tenant Data Isolation**: 10 out of 10 negative cross-tenant penetration tests (cross-tenant reads, writes, updates, deletes, nested foreign key forgery, and header spoofing) were rejected with `404 Not Found` or `403 Forbidden`.

### Production Blockers & Staging Conditions

Before full, unsupervised multi-tenant commercial SaaS release, the following items must be satisfied:

1. **Chartered Accountant (CA) Statutory Sign-off**: Formal legal sign-off is required for the periodic inventory COGS convention, GSTR-1 return tables, and MCA audit trail compliance under Section 143 and Rule 48(4).
2. **Production Infrastructure Secrets**: `JWT_SECRET` and `DATABASE_URL` must be injected via secure cloud vault (e.g., AWS Secrets Manager, Doppler, or HashiCorp Vault); development fallback keys have been hardened with a fatal error in production mode (`NODE_ENV=production`).
3. **Application-Layer Rate Limiting**: Installation of `@nestjs/throttler` with Redis cache backing on authentication and checkout endpoints to augment edge WAF protection.

---

## 2. Severity-Categorized Findings & Risk Matrix

| Finding ID  |  Severity  | Category           | Description                                                                                                                                  | Status / Resolution                                                                                                                                                                                 |
| :---------- | :--------: | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEC-001** |  **HIGH**  | Security / Auth    | Development fallback string used for `JWT_SECRET` when env var was omitted.                                                                  | **RESOLVED**: Updated `auth.module.ts` to throw a fatal error on startup if `JWT_SECRET` is unset in `production` mode.                                                                             |
| **SEC-002** | **MEDIUM** | Security / DB      | Raw SQL string interpolation (`$executeRawUnsafe`) was used in `DatabaseService.executeInTenantContext` to set PostgreSQL session variables. | **RESOLVED**: Converted to parameterized `SELECT set_config('app.current_organization_id', $1, true)` via `tx.$executeRaw`.                                                                         |
| **SEC-003** | **MEDIUM** | Security / Gateway | Permissive wildcard CORS (`app.enableCors()`) allowed arbitrary origins to connect.                                                          | **RESOLVED**: Configured origin filtering against `CORS_ORIGIN` / `FRONTEND_URL` environment variables with credentials support in `main.ts`.                                                       |
| **SEC-004** | **MEDIUM** | UI Security        | "Fill Demo Credentials" button was unconditionally visible on the login screen.                                                              | **RESOLVED**: Wrapped button in conditional environment check (`NODE_ENV !== 'production' \|\| NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS === 'true'`).                                                    |
| **SEC-005** | **MEDIUM** | Security / Gateway | No application-level rate limiting configured on `/auth/login`, `/auth/register`, or checkout routes.                                        | **DOCUMENTED / ACTION REQUIRED**: Recommend adding `@nestjs/throttler` with Redis before public internet exposure.                                                                                  |
| **ACC-001** |  **LOW**   | Accounting Policy  | Sales vouchers do not post perpetual COGS journal entries per transaction.                                                                   | **VERIFIED BY DESIGN**: Indian SME accounting standard uses the Periodic Inventory System (COGS calculated periodically via Opening Stock + Purchases - Closing Stock). Documented for CA approval. |
| **GST-001** |  **LOW**   | Compliance         | GSTR-1 screens are return preparation compilations, not direct GSP API filings.                                                              | **VERIFIED BY DESIGN**: Phase 6 scope delivers statutory data compilation (B2B, B2CL, B2CS, HSN, Docs). Live GSP API filing is deferred to Phase 8.                                                 |

---

## 3. Verified Security & Tenant Isolation Audit

### 3.1 Tenant Context Derivation Flow

Every authenticated API request passes through `TenantContextInterceptor`:

1. `user.organizationId` is extracted strictly from the cryptographically verified JWT payload.
2. If `x-organization-id` header is passed, the interceptor verifies `rawOrgHeader === user.organizationId`. Forged or mismatched organization headers throw `403 FORBIDDEN_TENANT_ACCESS`.
3. If `x-company-id` header is passed, the interceptor verifies that the company exists and belongs to the authenticated user's organization (`company.organizationId === user.organizationId`). Mismatches throw `403 FORBIDDEN_COMPANY_ACCESS`.
4. Branch headers (`x-branch-id`) are verified against the company, and users with branch-constrained roles (`CASHIER`, `BRANCH_MANAGER`, `SALESMAN`) must have a verified `userBranchAssignment` row. Unauthorized branch access throws `403 FORBIDDEN_BRANCH_ACCESS`.
5. Financial year headers (`x-financial-year-id`) are verified to belong to the active company.

### 3.2 Negative Penetration Test Suite Evidence

The security test suite (`scratch/security_negative_audit.mjs`) was executed against the live API between Tenant A (`Audit Traders Ahmedabad`) and an isolated, separately registered Tenant B (`Audit Corp B`):

| Test Case                       | Method & Endpoint                        | Payload / Header Context                      | Expected Result | Actual Result |   Status   |
| :------------------------------ | :--------------------------------------- | :-------------------------------------------- | :-------------: | :-----------: | :--------: |
| **Cross-Tenant Party Read**     | `GET /parties/:partyA_id`                | Tenant B Bearer Token                         | `404 Not Found` |     `404`     | **PASSED** |
| **Cross-Tenant Item Read**      | `GET /items/:itemA_id`                   | Tenant B Bearer Token                         | `404 Not Found` |     `404`     | **PASSED** |
| **Cross-Tenant Invoice Read**   | `GET /invoices/sales/:invA_id`           | Tenant B Bearer Token                         | `404 Not Found` |     `404`     | **PASSED** |
| **Cross-Tenant Party Update**   | `PUT /parties/:partyA_id`                | Tenant B Bearer Token                         | `404 Not Found` |     `404`     | **PASSED** |
| **Cross-Tenant Party Delete**   | `DELETE /parties/:partyA_id`             | Tenant B Bearer Token                         | `404 Not Found` |     `404`     | **PASSED** |
| **Cross-Tenant Invoice Cancel** | `POST /invoices/sales/:invA_id/cancel`   | Tenant B Bearer Token                         | `404 Not Found` |     `404`     | **PASSED** |
| **Cross-Tenant Payment Record** | `POST /invoices/sales/:invA_id/payments` | Tenant B Bearer Token                         | `404 Not Found` |     `404`     | **PASSED** |
| **Nested Resource Forgery**     | `POST /invoices/sales`                   | Tenant B Token + `partyId: partyA.id`         | `404 Not Found` |     `404`     | **PASSED** |
| **Company Header Spoofing**     | `GET /invoices/sales`                    | Tenant B Token + `x-company-id: companyA.id`  | `403 Forbidden` |     `403`     | **PASSED** |
| **Org Header Spoofing**         | `GET /invoices/sales`                    | Tenant B Token + `x-organization-id: orgA.id` | `403 Forbidden` |     `403`     | **PASSED** |

---

## 4. Accounting & Billing Integrity Audit

### 4.1 Double-Entry Balance Invariants

All posted financial vouchers in the database enforce the mathematical rule:
$$\sum \text{Debit} - \sum \text{Credit} = 0.00$$

- **Unbalanced Voucher Rejection**: When an unbalanced voucher (Dr ₹1000.00 != Cr ₹500.00) was submitted via `/vouchers`, the API rejected it with HTTP 400: `Unbalanced voucher: Total Debits (₹1000.00) must equal Total Credits (₹500.00). Difference is ₹500.00.`
- **Balanced Voucher Posting**: A balanced voucher (Dr ₹1000.00 == Cr ₹1000.00) posted successfully with auto-incremented voucher number `VCH-BAL-...` and ledger balances updated atomically.
- **Reversal Safety**: Vouchers support contra reversal via `/vouchers/:id/reverse`. Reversals create an immutable linked reversal voucher, flip debits and credits, and cannot be reversed more than once.

### 4.2 Concurrency & Idempotency

- **Advisory Lock Concurrency**: Invoice sequence numbers are allocated under `pg_advisory_xact_lock(hashtext('inv_seq_' || company_id || '_' || fy_id))` within the invoice issuance transaction. Parallel concurrent requests receive strictly unique, monotonically incrementing legal numbers without sequence gaps.
- **Idempotency-Key Protection**: Submitting duplicate POST requests with the same `Idempotency-Key` or `clientOfflineUuid` returns the existing persisted invoice or payment without creating duplicate stock deductions, journal vouchers, or receivables.
- **Overpayment Prevention**: Bill-by-bill payments exceeding the outstanding invoice balance are strictly blocked (`Settlement amount of ₹... exceeds outstanding invoice balance of ₹... Overpayments must be recorded as customer advances.`).

### 4.3 Financial Statement Reconciliation

All reports derive from real double-entry journal entries:

- **Trial Balance (`/reports/trial-balance`)**: Sum of all debit balances exactly equals sum of all credit balances.
- **Profit & Loss (`/reports/profit-and-loss`)**: Computes Gross Profit from Direct Sales Income minus Direct Expenses; computes Net Profit after Indirect Expenses.
- **Balance Sheet (`/reports/balance-sheet`)**: Current Assets + Fixed Assets equal Capital + Liabilities + Net Profit carried over from P&L.
- **Day Book (`/reports/daybook`)**: Reconciles daily cash and bank inflows/outflows with opening and closing balances.

### 4.4 Cryptographic Audit Trail & MCA Rule 3(1) Compliance Hardening

- **Deterministic Canonical Hashing**:
  - Implemented RFC 8785 canonical JSON serialization (`canonicalJsonStringify`) ensuring deterministic lexicographical UTF-16 key ordering, array order stability, primitive types preservation, date conversion to ISO-8601 strings, and explicit `null` handling.
  - Verification (`verifyRecord` and `verifyChain`) transparently supports `v2_canonical` while maintaining backwards compatibility with `v1_legacy` historic hashes.
- **Concurrency-Safe Advisory Lock Chaining**:
  - Hash chain appends are serialized per `(organizationId, companyId)` using PostgreSQL transaction-scoped advisory locks:
    `SELECT pg_advisory_xact_lock($1, $2)`
  - Reads of `lastLog` and inserts of the new audit record execute within the same locked transaction.
  - Verified under 10 parallel asynchronous writes: 0 chain forks, 0 duplicate `prevHash` links, and 100% chain integrity.
- **Caller Transaction Atomicity**:
  - All production financial operations (`InvoicesService` sales invoices, draft issue, payments, cancellations; `VouchersService` journal vouchers, contra reversals, receipt vouchers) pass the active transaction `tx` to `audit.record(..., tx)`.
  - If the audit log insert fails, the entire business transaction rolls back atomically.
- **Tenant Isolation on Audit Records**:
  - PostgreSQL Row-Level Security policy `audit_logs_tenant_isolation` enforces strict tenant context on both SELECT and INSERT operations, preventing cross-tenant leakage or spoofed records.

---

## 5. Inventory & GST Compliance

### 5.1 Physical Stock Movement & Valuation

- **Append-Only Stock Ledger**: Inward stock (Opening, Purchase, Returns) and outward stock (Sales Dispatch) are written to `stock_transactions`.
- **Negative Stock Policy**: If `allowNegativeStock = false` on the company, issuing an invoice or checking out at POS when stock is insufficient throws HTTP 400: `Insufficient stock for item "...". Available: 0, Requested: 1.` Service items (`type = 'SERVICE'`) do not require physical warehouse inventory.
- **Inventory Valuation Convention**: Valuations use FIFO unit costs recorded on every stock transaction. In accordance with Indian SME practice, Cost of Goods Sold is evaluated periodically rather than per-sale transaction.

### 5.2 Statutory GST Determinations (Section 170 CGST Act)

- **Intra-State vs Inter-State**: If Place of Supply (POS) matches Supplier State Code, taxes split equally into CGST (50%) and SGST (50%). If POS differs, 100% applies to IGST.
- **Section 170 Nearest-Rupee Round-Off**: Invoice grand total rounds to the nearest integer Rupee ($\pm ₹0.49$), and the rounding differential posts to the **Round Off Account** (`4990`).
- **GSTR-1 Return Preparation**: Compiles Table 4A (B2B invoices with customer GSTIN), Table 5A/7 (B2C Large/Small), Table 12 (HSN Summary with 4/6/8-digit HSN codes), and Table 13 (Document sequence ranges and cancelled document counts).
- **Statutory Boundary**: No live e-Invoice IRN portal or e-Way bill portal generation is performed without live GSP production credentials.

---

## 6. Frontend & User Experience Verification

### 6.1 Critical User Journeys Audited

All 10 critical user journeys were executed against live ports (`:3000` and `:4000`):

1. **Login & Session Management**: Phone/password login, JWT storage in localStorage, language preference persistence, and clean logout redirect.
2. **Context Switching**: Company switcher ("Audit Traders Ahmedabad"), Branch switcher ("Head Office - Ahmedabad"), and FY switcher ("FY 2026-2027") dynamically refresh UI data.
3. **Master Data Operations**: Customer, Supplier, Item, UOM, Batch, and Warehouse creation modals all functional with client-side and server-side validation.
4. **Sales Invoice Lifecycle**: Draft creation, real-time GST computation, invoice issuance with legal number assignment, printable A4 view, bill-by-bill payment recording, and cancellation.
5. **Voucher Management**: Multi-line double-entry voucher entry with live Dr/Cr balance verification, chronological register, and contra reversal.
6. **POS Terminal**: Fast touchscreen checkout, barcode/name search, quick cart adjustments, multi-mode tender (Cash/UPI/Card), and thermal receipt preview.
7. **Stock & Movement Tracking**: Stock summary balances and append-only stock movement histories.
8. **Reports & CSV Exports**: Live reports for Sales Register, Trial Balance, P&L, Balance Sheet, Day Book, Stock Summary, and GSTR-1, with CSV file downloads.
9. **Responsive Layouts**: Zero horizontal page overflow verified at 360px, 390px, 768px, 1024px, 1280px, and 1440px.
10. **Bilingual Localization**: Instant English / Gujarati toggle across all navigation items, form inputs, stat cards, and receipt templates.

---

## 7. Automated Test Suite Results

Every test and quality command was executed independently with clean exit code 0:

| Command             | Exit Code | Scope & Result                                                         |
| :------------------ | :-------: | :--------------------------------------------------------------------- |
| `pnpm format:check` |    `0`    | 100% of codebase files adhere to Prettier style rules                  |
| `pnpm lint`         |    `0`    | Zero ESLint errors, zero ESLint warnings across all 6 packages         |
| `pnpm type-check`   |    `0`    | 8/8 Turbo tasks successful, 0 TypeScript compile errors                |
| `pnpm test`         |    `0`    | 13 test files passed, 169 tests passed (144 API integration + 25 core) |
| `pnpm build`        |    `0`    | Full monorepo Turbo build passed; all 22 Next.js static pages compiled |

---

## 8. Chartered Accountant (CA) / Statutory Review Decisions

Before deploying this software to production paying customers, the following statutory policies must be reviewed by the client's appointed Chartered Accountant:

1. **Periodic vs Perpetual Inventory Policy**: Confirm that SME client companies operate under AS-2 / Ind AS 2 Periodic Inventory conventions where COGS is adjusted at period end, or whether certain enterprise clients will require perpetual COGS posting on sales invoices.
2. **GST Rounding Slab Aggregation**: Confirm whether invoice-level tax rounding should aggregate tax amounts by rate slab (current implementation: $\sum \text{slabTaxable} \times \text{rate}$) or sum line-item rounded taxes.
3. **Credit Note Accounting on Invoice Cancellation**: Under Section 34 of the CGST Act, issued invoices from previous tax periods require a formal Credit Note rather than a cancellation. Confirm policy for cancelling issued invoices across closed GST filing periods.
4. **MCA Audit Trail Certification**: Confirm that SHA-256 hash chaining of `audit_logs` satisfies the MCA Audit Trail requirement under Rule 3(1) of the Companies (Accounts) Rules, 2014.

---

## 9. Staging & Production Deployment Checklist

### Pre-Deployment Verification

- [x] Database migrations up to date (`prisma migrate deploy` executed cleanly).
- [x] All 22 Next.js routes prerender without hydration errors.
- [x] PostgreSQL RLS enabled and forced on all tenant tables.
- [x] Parameterized SQL queries enforced on all session variable injections.
- [x] Production check added to block startup if `JWT_SECRET` is unset.
- [x] Demo credentials helper disabled in production builds.
- [x] Health check endpoints (`GET /api/v1/health`, `/health/liveness`, `/health/readiness`) operational.
- [x] Global exception filter registered, suppressing stack traces and schema names in production.
- [x] Request correlation ID tracking enabled on all routes.
- [x] Automated accounting reconciliation suite passing with 100% agreement.

### Production Environment Variables Configuration

```env
# Production Environment Configuration
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://billing_user:<SECURE_PASSWORD>@db-prod.internal:5432/billing_db?schema=public&connection_limit=20"
JWT_SECRET="<MIN_32_CHAR_CRYPTOGRAPHICALLY_RANDOM_SECRET>"
JWT_EXPIRES_IN="1d"
CORS_ORIGIN="https://app.yourdomain.com"
FRONTEND_URL="https://app.yourdomain.com"
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api/v1"
NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS="false"
```

### Rollback & Disaster Recovery Procedures

1. **Automated Database Backups**: Enable continuous PostgreSQL Write-Ahead Log (WAL) archiving and daily full `pg_dump` snapshots.
2. **Migration Rollbacks**: Schema migrations add backward-compatible columns and policies. For emergency rollback, restore database snapshot from the pre-deployment PITR point.
3. **Application Version Rollback**: Fastify API and Next.js static assets can be rolled back to the previous container image tag with zero downtime.

---

## 10. Release Gate Decision

- **Staging Environment**: **STAGING GO**
  - All automated test suites (169 tests), database readiness probes, error shielding, correlation tracking, and backup/restore verification passed. Staging pilot is approved.
- **Commercial Production**: **CONDITIONAL PRODUCTION GO**
  - Conditioned upon formal Chartered Accountant (CA) review and sign-off on the [CA Review Dossier](file:///home/dell/Jaydeep/Billing/docs/ca-review-dossier.md), provisioning of Redis throttler for multi-instance clusters, and execution of the 14-day staging pilot checklist without unhandled defects.

No Phase 7 features have been started, preserving the strict project phase boundaries.
