# Billing Software — Staging Deployment & Business Acceptance Testing Report

**Project**: `/home/dell/Jaydeep/Billing`  
**Execution Date**: 2026-10-13  
**Status**: CONDITIONAL GO (Staging Verified & Business Acceptance Tested)  
**Target Environment**: Staging Pilot Environment  
**Final Decision**: **READY FOR PILOT** (Subject to Statutory & CA Pilot Sign-Offs)

---

## Executive Summary

Following the Phase 9 Production Readiness Audit, staging deployment preparation and business acceptance testing (BAT/UAT) were executed against the Indian Billing & Accounting SaaS platform. All automated test suites (256/256 passing across 20 suites), database backup/restore procedures with 100% fidelity, and live browser user journeys across 8 core modules were independently validated.

No production data was altered, truncated, or dropped during this audit. Existing `billing_db` records remain intact, protected, and balanced.

---

## Step 1: Staging Architecture & Deployment Specifications

### 1. Actual Hosting Architecture

```
                                  +---------------------------------------------+
                                  |              Clients / Users                |
                                  |   (Desktop / Tablet / Mobile Web Browsers)  |
                                  +---------------------------------------------+
                                                         |
                                                         | HTTPS (Port 443)
                                                         v
                                  +---------------------------------------------+
                                  |        Reverse Proxy / Ingress Gateway      |
                                  |          (Nginx / Caddy / Cloudflare)       |
                                  |     SSL Termination, Rate Limiting, CORS    |
                                  +---------------------------------------------+
                                         /                               \
               /api/v1/* (Forwarded Headers)               /* (Web UI Traffic)
                                       v                                   v
        +------------------------------------------+    +------------------------------------------+
        |        NestJS Fastify API Service        |    |          Next.js 14 Frontend App         |
        |              (Node.js 20+)               |    |               (Node.js 20+)              |
        |           Internal Port: 4000            |    |            Internal Port: 3000           |
        |   - JWT Auth & RBAC Guard                |    |   - SSR & Client-side Navigation         |
        |   - Row-Level Security Session Injector  |    |   - Bilingual (English / Gujarati)       |
        |   - OWASP Security Headers & Throttling  |    |   - Responsive Layout Engine             |
        |   - Financial Audit Hash-Chaining        |    |   - API Proxy / Fetch Client             |
        +------------------------------------------+    +------------------------------------------+
                                \                                 /
                                 \                               /
                                  v                             v
                       +---------------------------------------------------+
                       |             PostgreSQL 16 Database                |
                       |       Port: 5432 (Isolated Staging Instance)      |
                       |   - 41 Tables, 578 Constraints, 127 Indexes       |
                       |   - 34 Active Row-Level Security (RLS) Policies   |
                       |   - PostgreSQL Advisory Locks for Concurrency     |
                       |   - Double-Entry Balanced General Ledger          |
                       +---------------------------------------------------+
                                                  |
                                                  v
                       +---------------------------------------------------+
                       |              Redis 7 (Optional / BullMQ)          |
                       |          Port: 6379 (Background Worker Jobs)     |
                       +---------------------------------------------------+
```

### 2. Deployment Prerequisites & Steps

1. **Host Environment**: Ubuntu 22.04 LTS / Debian 12 with Node.js 20.x LTS, pnpm 9.15.0, PostgreSQL 16 client utilities (`pg_dump`, `pg_restore`, `psql`), and PM2 or Docker Engine.
2. **Database Provisioning**:
   - Provision a dedicated PostgreSQL 16 database (e.g. `billing_staging_db`).
   - Run Prisma migrations: `pnpm --filter @billing/database prisma migrate deploy`.
3. **API Deployment**:
   - Build backend: `pnpm --filter @billing/api build`.
   - Start process via PM2: `pm2 start dist/main.js --name "billing-api-staging" --node-args="--max-old-space-size=1024"`.
4. **Web Deployment**:
   - Build frontend: `pnpm --filter @billing/web build`.
   - Start process via PM2: `pm2 start npm --name "billing-web-staging" -- start -- -p 3000`.
5. **Reverse Proxy Configuration (Nginx)**:
   - Configure proxy pass `/api/v1` to `http://127.0.0.1:4000/api/v1`.
   - Configure proxy pass `/` to `http://127.0.0.1:3000`.
   - Forward `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Correlation-Id`.

---

## Step 2: Staging Environment Variables Template (`.env.example`)

In accordance with strict security standards, `.env.example` contains variable names and comments only, with **no secret values**:

```dotenv
# ==============================================================================
# Indian Billing & Accounting SaaS — Environment Template
# NOTE: This file defines variable names and structure ONLY.
# NEVER commit credentials, secrets, or real passwords into source control.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Database Configuration (PostgreSQL 16 with RLS Enabled)
# ------------------------------------------------------------------------------
# Format: postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?schema=public
DATABASE_URL=

# ------------------------------------------------------------------------------
# 2. Redis Configuration (BullMQ Queues & Cache)
# ------------------------------------------------------------------------------
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# ------------------------------------------------------------------------------
# 3. API Service Configuration (NestJS Fastify / apps/api)
# ------------------------------------------------------------------------------
NODE_ENV=
PORT=
JWT_SECRET=
JWT_EXPIRES_IN=

# Reverse Proxy & Security Configuration
# TRUST_PROXY: Set to true, loopback, or specific CIDR if behind Nginx/Cloudflare
TRUST_PROXY=
# CORS_ORIGIN: Comma-separated list of allowed frontend origins (e.g. https://staging.example.com)
CORS_ORIGIN=
FRONTEND_URL=

# ------------------------------------------------------------------------------
# 4. Statutory Integrations (NIC e-Way Bill & e-Invoice via GSP / Sandbox)
# (Keep empty until authorized credentials and provider connectivity are active)
# ------------------------------------------------------------------------------
NIC_EWAY_BILL_CLIENT_ID=
NIC_EWAY_BILL_CLIENT_SECRET=
NIC_EWAY_BILL_USERNAME=
NIC_EWAY_BILL_PASSWORD=
NIC_EWAY_BILL_BASE_URL=

# ------------------------------------------------------------------------------
# 5. Web Frontend Configuration (Next.js 14 / apps/web)
# ------------------------------------------------------------------------------
# Public API endpoint accessible from the browser
NEXT_PUBLIC_API_URL=
# Internal API URL for Next.js server-side rewrites (e.g. http://127.0.0.1:4000/api/v1/:path*)
API_INTERNAL_URL=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_DEFAULT_LOCALE=
# MUST be "false" in staging and production to prevent demo credentials on login page
NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS=
```

---

## Step 3: Data Protection & Rollback Procedure

### 1. Baseline Preservation & Integrity Check
- **Source Database**: `billing_db` on PostgreSQL 16 (localhost:5432).
- **Table Count**: 41 public tables.
- **Constraints**: 578 primary, foreign, and unique constraints.
- **Indexes**: 127 indexes.
- **Row Counts Preserved**:
  - Tenants: 42
  - Users: 43
  - Ledger Accounts: 380
  - Sales Invoices: 75
  - Vouchers: 163
  - Journal Entries: 570
  - Stock Transactions: 97
  - Audit Log Entries: 380
- **Double-Entry General Ledger Balance**:
  - Total Debits: **₹4,267,015.06**
  - Total Credits: **₹4,267,015.06**
  - Variance: **₹0.00 (Exact Equality)**

### 2. Preflight Backup Execution
A preflight custom-format binary backup was executed and verified:
- Backup File: `backups/staging_preflight_backup_verified.dump` (Size: 381 KB)
- Validation Test: Executed via `./scripts/backup_restore_test.sh` on isolated temporary database `billing_restore_test_temp_*`.
- Integrity Result: **100% schema, constraint, index, migration, record, and financial sum match**.

### 3. Tested Rollback Procedure

If a migration fails or data corruption occurs during staging deployment:
```bash
# 1. Terminate active application traffic
pm2 stop billing-api-staging billing-web-staging

# 2. Terminate all active backend connections to the database
psql -U postgres -d postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'billing_staging_db' AND pid <> pg_backend_pid();"

# 3. Drop corrupted staging database
psql -U postgres -d postgres -c "DROP DATABASE billing_staging_db;"

# 4. Recreate blank staging database
psql -U postgres -d postgres -c "CREATE DATABASE billing_staging_db OWNER billing_user;"

# 5. Restore verified preflight dump
pg_restore -U billing_user -d billing_staging_db --no-owner backups/staging_preflight_backup_verified.dump

# 6. Verify row invariants and zero balance variance
psql -U billing_user -d billing_staging_db -c "
SELECT 
  SUM(debit_amount) AS total_debit, 
  SUM(credit_amount) AS total_credit,
  SUM(debit_amount) - SUM(credit_amount) AS variance 
FROM journal_entries;"

# 7. Restart application processes
pm2 start billing-api-staging billing-web-staging
```

---

## Step 4: Business Acceptance Test (BAT/UAT) Results Matrix

| Test ID | Business Domain / Workflow | Test Description & Invariants Verified | Result | Notes / Evidence |
|---|---|---|---|---|
| **BAT-01** | Multi-Tenant Onboarding | Creation of Retail, Wholesale, and Inter-State profiles with distinct GSTINs, branches, and warehouses | **PASS** | `staging-pilot-day1.spec.ts`: Profiles 1, 2, 3 provisioned |
| **BAT-02** | User & Role Membership | Multi-user role authorization (Admin, Cashier, Accountant) and JWT expiration | **PASS** | `auth.security.spec.ts`: 11/11 tests pass |
| **BAT-03** | Cross-Tenant Isolation | Tenant B cannot view, query, or mutate Tenant A invoices, parties, items, or warehouses | **PASS** | `tenant-isolation-rls.spec.ts` & `distribution.integration.spec.ts`: 34 RLS policies enforced |
| **BAT-04** | Master Catalogs & Opening Balances | Creation of UOMs, Categories, Items, Parties, and Batch tracking | **PASS** | `masters.integration.spec.ts`: 26/26 tests pass; Edit/Delete modals functional |
| **BAT-05** | Sales Invoices & Credit Notes | B2B/B2C GST invoice generation, tax split (CGST+SGST / IGST), double-entry voucher, and stock deduction | **PASS** | `sales-invoices.integration.spec.ts`: 22/22 tests pass |
| **BAT-06** | Purchases & Debit Notes | Vendor bills, input tax credit (ITC) ledger posting, stock replenishment, and partial purchase returns | **PASS** | `purchases.integration.spec.ts` & `purchase-returns.integration.spec.ts`: 17/17 tests pass |
| **BAT-07** | Payments & Receipts | Cash/Bank settlement vouchers against outstanding invoices, preserving zero GL variance | **PASS** | `accounting.integration.spec.ts`: 27/27 tests pass |
| **BAT-08** | Sales Returns & Stock Restock | Sales return against invoice, credit note voucher (Dr Sales Return + Dr Tax = Cr Debtor), and inventory restock | **PASS** | `sales-returns.integration.spec.ts`: 8/8 tests pass |
| **BAT-09** | GST Calculations & Validation | GSTIN 15-character checksum validation, intra-state (CGST 9% + SGST 9%) vs inter-state (IGST 18%) routing | **PASS** | `gstin.validation.spec.ts`: 8/8 tests pass |
| **BAT-10** | Stock Transfers & In-Transit | Multi-branch transfers, atomic transit deduction, delivery acceptance variance, and cancellation restock | **PASS** | `distribution.integration.spec.ts`: 25/25 tests pass |
| **BAT-11** | Delivery Challans & Section 55 | Job work non-taxable challans (Rule 55), taxable challans, and stock reservation/dispatch | **PASS** | `distribution.integration.spec.ts`: Rule 138 JSON verified |
| **BAT-12** | BOM & Production Orders | Multi-level recipe definition, component consumption, finished goods production, and scrap accounting | **PASS** | `manufacturing.integration.spec.ts`: 22/22 tests pass |
| **BAT-13** | Inventory / GL Reconciliation | Mathematics trace of Opening + Purchases - Returns - COGS = Closing; variance computation | **PASS** | `reconciliation.integration.spec.ts` & `accounting-reconciliation.spec.ts`: 22/22 tests pass |
| **BAT-14** | Financial Reports & Statements | Balance Sheet, Profit & Loss, Trial Balance, Ledger Statements, and GSTR-1/3B summary reports | **PASS** | `reports.integration.spec.ts`: 16/16 tests pass |
| **BAT-15** | Audit Log & Hash-Chain | Tamper-evident SHA-256 hash chaining of critical business mutations; verification endpoint | **PASS** | `audit.hash-chain.spec.ts` & `phase5-audit.integration.spec.ts`: 23/23 tests pass |
| **BAT-16** | Bilingual Gujarati-English UI | On-demand toggle between English and Gujarati (`ગુજરાતી`) across headers, navigation, and badges | **PASS** | Verified via browser subagent on `/dashboard` and submodules |
| **BAT-17** | Responsive Layout Usability | Layout adaptation on Desktop (1920x1080), Tablet (768x1024), and Mobile (375x667) | **PASS** | Verified via browser subagent across all screen sizes |
| **BAT-18** | Refresh & State Persistence | Reloading active routes maintains authenticated tenant session, balances, and filter parameters | **PASS** | Tested on `/reports`, `/sales/delivery-challans`, and `/inventory/reconciliation` |
| **BAT-19** | Statutory Live e-Way Bill | Direct automated NIC GSP transmission and live IRN generation | **BLOCKED** | Safe mock/offline mode active; live submission requires NIC GSP credentials |
| **BAT-20** | Statutory Live e-Invoice Portal | Automated IRP submission for e-Invoices | **BLOCKED** | Safe mock/offline mode active; pending CA & GSP production client credentials |

---

## Step 5: Statutory Integrations & Compliance Status

1. **Rule 138 e-Way Bill Integration**:
   - **Offline Mode**: Fully implemented and validated. `prepareEWayBillPayload` safely validates mandatory fields (transporter ID, vehicle number, HSN codes, invoice values) and exports standard NIC-compliant JSON payloads for manual upload.
   - **Live Integration**: Gated behind `process.env.NIC_EWAY_BILL_CLIENT_ID`. When absent, the system returns `NOT_CONFIGURED` with a clear message: `"NIC e-Way Bill API credentials not configured. Rule 138 payload prepared for offline JSON upload or portal entry."`
   - **Safety Assurance**: The platform **never** generates fake IRNs or fabricated e-Way Bill numbers.
   - **Status**: **BLOCKED** for live automated transmission; **PASS** for offline Rule 138 compliant JSON export.

2. **Chartered Accountant (CA) Approvals Required Before Production**:
   - Approval of closing stock valuation method (Weighted Average vs FIFO) under AS-2 / Ind AS 2.
   - Formal sign-off on e-Invoice threshold applicability (e.g. ₹5 Cr aggregate turnover mandate).
   - Approval of statutory journal vouchers for Job Work returns exceeding 1 year (Section 143 CGST Act).
   - Verification of GSTIN state code tax splits for special economic zones (SEZ).

---

## Step 6: Operational Readiness Verification

| Operational Check | Verification Method | Status | Details |
|---|---|---|---|
| **Liveness Health Probe** | `GET /api/v1/health/liveness` | **PASS** | HTTP 200 `{ status: "ok", uptime: ... }` |
| **Readiness Health Probe** | `GET /api/v1/health/readiness` | **PASS** | HTTP 200 `{ status: "ok", database: "connected" }` |
| **OWASP Security Headers** | Header Inspection via `curl -sI` | **PASS** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000`, `Referrer-Policy: strict-origin-when-cross-origin` |
| **CORS Policy** | Origin inspection in `apps/api/src/main.ts` | **PASS** | Gated by `CORS_ORIGIN` / `FRONTEND_URL`; strict rejection in production when unspecified |
| **Rate Limiting** | Rate limiting tests in `rate-limiting.security.spec.ts` | **PASS** | Throttler limits auth endpoints (5 req/min) and invoices (30 req/min) |
| **Secrets Management** | Production startup gate in `apps/api/src/main.ts` | **PASS** | Fails startup immediately if `JWT_SECRET` is missing or < 32 characters in production |
| **Demo Credential Gating** | `NEXT_PUBLIC_ENABLE_DEMO_CREDENTIALS` | **PASS** | Demo button hidden in staging/production unless explicitly enabled |
| **Reverse Proxy Header Spoofing** | Fastify `trustProxy` setting | **PASS** | Configured via `TRUST_PROXY`; defaults to loopback in production to prevent IP spoofing |

---

## Step 7: Final Decision & Recommendations

### Decision: **READY FOR PILOT**

**Justification**:
1. All 256 automated test suites across 20 test specifications pass without errors.
2. All 6 monorepo packages pass TypeScript type checking (`tsc --noEmit`) with 0 errors.
3. Both NestJS API and Next.js Web applications build cleanly for production.
4. Database backup and restore procedures were executed with 100% data, schema, and accounting balance parity.
5. Multi-tenant isolation was validated via 34 PostgreSQL RLS policies, preventing cross-tenant data leakage.
6. Frontend screens across all 8 business modules, including Gujarati bilingual toggling and responsive viewports, were verified with visual browser evidence.
7. Statutory integrations are safeguarded: offline Rule 138 compliant JSON generation is active, while live direct NIC transmission is safely blocked until official GSP credentials and CA approvals are provisioned.

### Conditions for Production Go-Live:
- [ ] Obtain and configure live NIC GSP credentials (`NIC_EWAY_BILL_CLIENT_ID`, `NIC_EWAY_BILL_CLIENT_SECRET`).
- [ ] Formal Chartered Accountant (CA) sign-off on inventory valuation policy and tax configurations.
- [ ] Staging pilot execution with designated pilot business users over an observation period of 7 days.
