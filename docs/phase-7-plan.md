# Phase 7 Plan — Production Hardening, Staging Pilot & Release Readiness

**Project:** Billing & Accounting SaaS  
**Repository:** `/home/dell/Jaydeep/Billing`  
**Date:** October 2026  
**Status:** Hardening Implemented, Reconciled & Verified

---

## 1. Executive Summary & Findings Before Implementation

### 1.1 Pre-Implementation Audit

Prior to Phase 7 implementation, a thorough audit of all existing documentation (`architecture.md`, `database-design.md`, `accounting-rules.md`, `gst-integration.md`, `final-evidence-verification.md`, `ca-review-dossier.md`) and the active repository was completed.

- **Phases 1–6 Baseline**:
  - Exact Decimal double-entry accounting engine (`@billing/accounting-core`).
  - Row-Level Security (RLS) policies on 20 PostgreSQL tables with parameterized `set_config` session scoping.
  - Rate limiting active on sensitive authentication and billing endpoints.
  - Cryptographic audit trail with RFC 8785 canonical hashing and transaction-scoped advisory locking (`pg_advisory_xact_lock`).
  - 157 automated tests passing prior to Phase 7.
- **Identified Production Gaps Remediated in Phase 7**:
  1. **Correlation Tracking**: Added `CorrelationIdInterceptor` supporting incoming `x-correlation-id` / `x-request-id` or generating UUIDs, stamping response headers, and outputting structured JSON access logs.
  2. **Error & Stack Trace Shielding**: Implemented global `HttpExceptionFilter` in NestJS Fastify adapter ensuring internal database errors, schema details, and stack traces are suppressed in production mode (`NODE_ENV === 'production'`) while logging structured server-side diagnostic events.
  3. **Readiness & Liveness Probes**: Enhanced `HealthController` with `/health/liveness` (process uptime) and `/health/readiness` (active PostgreSQL query probe `SELECT 1`).
  4. **Graceful Shutdown**: Enabled `app.enableShutdownHooks()` in Fastify bootstrap to drain in-flight transactions safely during container termination.
  5. **Reverse Proxy Trust**: Configured `trustProxy` in `main.ts` to respect explicit `TRUST_PROXY` CIDR / IP configurations, defaulting to loopback `127.0.0.1` in production to prevent IP header spoofing.
  6. **Automated Accounting Reconciliation**: Created `apps/api/test/accounting-reconciliation.spec.ts` executing 8 mathematical and statutory consistency checks across all persisted records.
  7. **Migration Reproducibility**: Tested fresh migration deployment (`prisma migrate deploy`) against disposable temporary databases with 100% success.

---

## 2. Production Security Hardening Evidence

| Security Control              | Implementation                                                                                                                                                                                    |                          Verification Status                           |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------: |
| **Tenant Isolation**          | Server-side `TenantContextInterceptor` verifies organization, company, branch, and FY IDs derived strictly from cryptographically verified JWT tokens. Cross-tenant headers reject with HTTP 403. | **VERIFIED** (`auth.security.spec.ts`, `tenant-isolation-rls.spec.ts`) |
| **PostgreSQL RLS**            | Session variables set via `SET LOCAL` within transaction boundaries (`app.current_organization_id`, `app.current_company_id`, `billing_app` role). Direct bypass is restricted.                   |                 **VERIFIED** (6 RLS integration tests)                 |
| **Privilege Escalation**      | Cashier role forbidden from creating branches, switching cross-tenant context, or tampering with user permissions.                                                                                |                 **VERIFIED** (`auth.security.spec.ts`)                 |
| **Startup Secret Validation** | In `main.ts` and `auth.module.ts`, application startup immediately blocks with fatal exit if `JWT_SECRET` is unset or $< 32$ characters in production mode.                                       |                  **VERIFIED** (Enforced at bootstrap)                  |
| **Reverse Proxy Hardening**   | Fastify configured to parse explicit `TRUST_PROXY` IP/CIDR; defaults to loopback in production to prevent spoofed `X-Forwarded-For`.                                                              |                        **VERIFIED** (`main.ts`)                        |
| **Error Sanitization**        | `HttpExceptionFilter` conceals 500 error internal stack traces and database schemas from external API responses in production.                                                                    |               **VERIFIED** (`http-exception.filter.ts`)                |
| **Rate Limiting**             | `@nestjs/throttler` limits `/auth/login` and `/auth/register` (5/min), `/invoices/sales` and `/invoices/pos-checkout` (30/min).                                                                   |            **VERIFIED** (`rate-limiting.security.spec.ts`)             |

---

## 3. Automated Accounting & Statutory Reconciliation Results

Implemented in [`apps/api/test/accounting-reconciliation.spec.ts`](file:///home/dell/Jaydeep/Billing/apps/api/test/accounting-reconciliation.spec.ts) (8 automated checks, 100% passing):

1. **Total Debits = Total Credits**: Sum of all debit amounts in `journal_entries` strictly equals sum of all credit amounts ($\text{Dr } 284,006.06 = \text{Cr } 284,006.06$). Zero unbalanced vouchers exist.
2. **Trial Balance Agreement**: Sum of all closing debit balances equals closing credit balances across all active ledger accounts.
3. **Balance Sheet Consistency**: Net assets ($\text{Assets} - \text{Liabilities}$) equal Equity plus current period Retained Net Profit ($\Delta \le 0.00$).
4. **Invoice Line & Tax Totals Reconciliation**: For every issued/paid sales invoice, $\sum \text{Taxable} + \sum \text{Tax} + \text{RoundOff} \equiv \text{GrandTotal}$. All Section 170 round-off adjustments fall within $[-0.50, +0.50]$.
5. **Payment Allocation Bounds**: Total allocated receipt amounts never exceed invoice grand total; overpayments are prevented.
6. **Stock Ledger Integrity**: No negative unit valuation rates exist in `stock_transactions`; valuation rate calculations remain consistent.
7. **Cancellation & Contra Audit Trail**: Every cancelled invoice retains its original audit trail log and has an associated contra stock restoration transaction (`SALES_CANCELLATION`).
8. **GST Statutory Place-of-Supply**: Intra-state invoices have $\text{IGST} = 0.00$ and $\text{CGST} = \text{SGST}$; inter-state invoices have $\text{CGST} = \text{SGST} = 0.00$.

---

## 4. 14-Day Staging Pilot Protocol & Test Company Profiles

### 4.1 Test Company Profiles (Synthetic Data Only)

#### Profile 1: Retail / POS Business

- **Legal Name**: Shree Ambica Provision Store Pvt Ltd
- **Trade Name**: Ambica Supermarket (Ahmedabad, Gujarat — State Code: 24)
- **Business Model**: High-volume, small-ticket FMCG grocery retail with barcode scanning, cash/UPI split payments, and thermal slip printing.
- **Primary Operational Focus**: POS checkout latency ($< 300\text{ms}$), offline invoice syncing with idempotency keys, Section 170 nearest-rupee cash rounding, and cash register reconciliation in Day Book.

#### Profile 2: Wholesale & Distribution Business

- **Legal Name**: Gujarat Agro-Commodities Trading LLP
- **Trade Name**: Krishi Mandi Wholesalers (Surat, Gujarat — State Code: 24)
- **Business Model**: Bulk agricultural grains, pulses, and spices traded in bags and quintals with credit terms (15–30 days) and batch tracking (expiry & harvest dates).
- **Primary Operational Focus**: Bill-by-bill outstanding receivables, multi-bill receipt matching via payment vouchers, batch allocation, credit limit enforcement, and Party Ledger statements.

#### Profile 3: Inter-State Trading Business

- **Legal Name**: Western Industrial Spares & Equipment Corporation
- **Trade Name**: Western Machinery Spares (Vadodara, Gujarat — State Code: 24)
- **Business Model**: B2B supply of machinery parts and electrical components to buyers in Maharashtra (27), Rajasthan (08), and Karnataka (29).
- **Primary Operational Focus**: Inter-state IGST billing (18% and 28%), customer GSTIN format verification, e-Invoice preparation JSON exports, and GSTR-1 Table 4A/Table 12 HSN summary compilation.

---

### 4.2 14-Day Staging Pilot Execution Checklist

|    Day     | Target Workflows & Operations              | Profile Focus    | Acceptance Criteria                                                                                               |
| :--------: | :----------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------- |
| **Day 1**  | Organization & Multi-Company Provisioning  | Profiles 1, 2, 3 | Clean tenant initialization, company switcher, branch assignments, and financial year setup.                      |
| **Day 2**  | Master Data Import & Seeding               | Profiles 1, 2, 3 | Items, GST rates, HSN codes, UOMs, customer/supplier parties, and opening ledger balances seeded.                 |
| **Day 3**  | Retail POS High-Volume Billing             | Profile 1        | 100+ simulated POS transactions, barcode lookups, split tender (Cash + UPI), receipt generation.                  |
| **Day 4**  | POS Offline Sync & Network Drops           | Profile 1        | Simulated offline client queue submission; verify idempotency deduplication with zero duplicate stock deductions. |
| **Day 5**  | B2B Credit Sales Invoicing                 | Profiles 2 & 3   | Tax invoices issued with sequential legal numbering; draft vs issued lifecycle validated.                         |
| **Day 6**  | Bill-by-Bill Payment Allocation            | Profile 2        | Multi-bill payment receipts matched against outstanding invoices; verify partial payment balances.                |
| **Day 7**  | Inter-State IGST & Place of Supply         | Profile 3        | Inter-state invoices verified: CGST/SGST zeroed, 100% IGST applied, customer GSTIN verified.                      |
| **Day 8**  | Invoice Cancellation & Contra Reversals    | Profiles 1, 2, 3 | Cancellation of issued invoices; verify stock restored via `SALES_CANCELLATION` and contra voucher posted.        |
| **Day 9**  | Manual Journal Vouchers & Period Locks     | Profiles 2 & 3   | Complex multi-line double-entry vouchers entered; period lock tested preventing backdated mutations.              |
| **Day 10** | Stock Valuation & FIFO Movement Audit      | Profiles 1 & 2   | Stock summary report verified against append-only movements; FIFO batch valuations verified.                      |
| **Day 11** | GST Report Compilation & CSV Exports       | Profiles 1, 2, 3 | GSTR-1 Table 4A, 5A, 7, 12, 13 generated; offline JSON exported; tax liability reconciled.                        |
| **Day 12** | Full Financial Statement Reconciliation    | Profiles 1, 2, 3 | Trial Balance, Profit & Loss, Balance Sheet, and Day Book verified with zero mathematical discrepancy.            |
| **Day 13** | Concurrency, Rate Limiting & Tamper Tests  | Profiles 1, 2, 3 | Parallel writes executed; rate limit 429 verified; audit trail unbroken chain verified.                           |
| **Day 14** | Automated Backup & Disaster Recovery Probe | Profiles 1, 2, 3 | Nightly backup taken, restored into temporary DB, and checked with 100% row and RLS policy match.                 |

---

## 5. Automated Verification Results

All repository verification commands were executed directly:

| Command                             | Exit Code | Verified Scope                                                                      |   Result   |
| :---------------------------------- | :-------: | :---------------------------------------------------------------------------------- | :--------: |
| `pnpm format:check`                 |    `0`    | All repository `.ts`, `.tsx`, `.md`, `.json` files adhere to Prettier rules         | **PASSED** |
| `pnpm lint`                         |    `0`    | Zero ESLint warnings or errors across all 6 workspace packages                      | **PASSED** |
| `pnpm type-check`                   |    `0`    | 8/8 Turbo tasks passed; 0 TypeScript errors                                         | **PASSED** |
| `pnpm exec turbo run test --force`  |    `0`    | **169 tests passed, 0 failed, 0 skipped** across 13 test suites (144 API + 25 core) | **PASSED** |
| `pnpm exec turbo run build --force` |    `0`    | Full build; 22 Next.js static pages & NestJS API distribution bundle                | **PASSED** |
| `./scripts/backup_restore_test.sh`  |    `0`    | 100% record and schema match across 33 tables, 436 constraints, 20 RLS policies     | **PASSED** |
| Migration Deploy Test               |    `0`    | All 7 Prisma migrations applied cleanly to a fresh disposable database              | **PASSED** |

---

## 6. Release Gate Verdict

### Staging Environment: **STAGING GO**

- Observability (correlation IDs, structured logs, database readiness probes) is fully active.
- Error shielding conceals internal details from external clients.
- Automated accounting reconciliation suite passes 100%.
- Staging pilot protocol with 3 business profiles is approved for execution on isolated staging infrastructure.

### Commercial Production: **CONDITIONAL PRODUCTION GO**

Commercial rollout to paying end-customers requires completion of the following non-technical prerequisites:

1. **Chartered Accountant (CA) Statutory Sign-Off**: Formal review and sign-off on the [CA Review Dossier](file:///home/dell/Jaydeep/Billing/docs/ca-review-dossier.md) covering Periodic Inventory (AS-2), Balance Sheet presentation, Section 170 round-off, and MCA Rule 3(1) audit trail.
2. **Distributed Redis Throttler**: Provisioning of Redis adapter for `@nestjs/throttler` if more than one API pod is deployed behind the production load balancer.
3. **14-Day Pilot Execution**: Successful completion of the 14-day staging pilot checklist without critical severity defects.
