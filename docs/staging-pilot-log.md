# 14-Day Staging Pilot Execution Log — Indian Billing & Accounting SaaS

**Project:** Billing & Accounting SaaS  
**Repository:** `/home/dell/Jaydeep/Billing`  
**Pilot Environment:** Staging Isolated Test Database (`billing_db` on PostgreSQL 16)  
**Start Date:** October 12, 2026  
**Target Completion:** October 26, 2026  
**Pilot Status:** Day 1 Completed & Verified | Days 2–14 Scheduled

---

## 1. Synthetic Company Profiles Under Pilot

The staging pilot utilizes three isolated synthetic business profiles representing distinct Indian SME verticals:

### Profile 1: Retail / POS Business

- **Legal Entity:** Shree Ambica Provision Store Pvt Ltd
- **Trade Name:** Ambica Supermarket
- **Location:** Ahmedabad, Gujarat (State Code: `24`)
- **GSTIN:** `24AAACA1111A1Z1`
- **Primary Operational Focus:** Fast barcode checkout, tax-inclusive grocery billing, split tender (Cash + UPI), Section 170 nearest-rupee cash rounding, offline POS synchronization.

### Profile 2: Wholesale & Distribution Business

- **Legal Entity:** Gujarat Agro-Commodities Trading LLP
- **Trade Name:** Krishi Mandi Wholesalers
- **Location:** Surat, Gujarat (State Code: `24`)
- **GSTIN:** `24BBBCB2222B1Z2`
- **Primary Operational Focus:** Multi-branch operations (Head Office + APMC Market Yard Depot), batch and expiry tracking, 15–30 day credit billing, bill-by-bill payment receipts, and party ledger reconciliation.

### Profile 3: Inter-State Trading Business

- **Legal Entity:** Western Industrial Spares & Equipment Corporation
- **Trade Name:** Western Machinery Spares
- **Location:** Vadodara, Gujarat (State Code: `24`)
- **GSTIN:** `24CCCCD3333C1Z3`
- **Primary Operational Focus:** B2B inter-state supplies (Maharashtra `27`, Rajasthan `08`, Karnataka `29`), 100% IGST taxation, customer GSTIN validation, GSTR-1 Table 4A / Table 12 HSN summaries, e-Invoice export schema.

---

## 2. Daily Pilot Execution Log

### Day 1: October 12, 2026 — Multi-Tenant Organization & Company Provisioning

- **Environment:** Staging API (`http://localhost:4000/api/v1`), PostgreSQL 16, RLS active.
- **Workflow & Scenario:**
  1. Automated atomic onboarding via `POST /api/v1/auth/register` for Profiles 1, 2, and 3.
  2. Main branch, initial financial year (`FY 2026-27`), and initial company admin assignment.
  3. Wholesale multi-branch setup: Creation of secondary branch `APMC Market Yard Depot` (`APMC-SURAT`) via `POST /api/v1/tenants/branches`.
  4. Warehouse allocations:
     - Profile 1: `Retail Front Store Godown` (Default).
     - Profile 2: `APMC Godown No. 12` assigned to branch `APMC-SURAT`.
     - Profile 3: `Makarpura Central Logistics Hub` (Default).
  5. Cross-tenant isolation verification: Profile 1 attempts to query Profile 2 branches; Profile 2 queries warehouses; Profile 3 verifies financial year boundaries.
  6. Cryptographic audit trail generation verification.
- **Expected Results:**
  - HTTP 201 Created for all onboarding and provisioning endpoints.
  - `x-correlation-id` response header matched incoming request ID.
  - Zero cross-tenant data leakage: Profile 1 branch query excludes Profile 2's `APMC-SURAT`.
  - Audit trail entries created with valid SHA-256 `recordHash`.
- **Actual Results:**
  - All 4 automated test scenarios in [`test/staging-pilot-day1.spec.ts`](file:///home/dell/Jaydeep/Billing/apps/api/test/staging-pilot-day1.spec.ts) passed with 100% fidelity.
  - Profile 1 registered (ID: `org1Id`), Profile 2 registered (ID: `org2Id`), Profile 3 registered (ID: `org3Id`).
  - Correlation ID `pilot-p1-reg-001` preserved through NestJS interceptor pipeline.
  - Cross-tenant leakage: `0` records leaked across tenant boundaries.
  - Cryptographic audit trail: Verified 3+ entries with valid SHA-256 hashes.
- **Reconciliation Evidence:**
  - Automated test execution: `pnpm --filter @billing/api test test/staging-pilot-day1.spec.ts` (Exit code: `0`, 4/4 tests passed).
  - Schema integrity: Verified foreign keys, unique constraints, and tenant RLS filters in PostgreSQL.
- **Defect Severity & Reproduction Steps:**
  - None. Zero regressions or security defects identified.
- **Status:** **COMPLETED & VERIFIED**

---

### Day 2: October 13, 2026 — Master Data Seeding & Opening Balances

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Bulk import of item masters, HSN codes, GST rates (0%, 5%, 12%, 18%, 28%), UOMs (PCS, KGS, BAG), customer/supplier parties with state codes, opening stock entries, and opening ledger balances.
- **Acceptance Criteria:** Opening Trial Balance debit equals credit ($\sum \text{Dr} = \sum \text{Cr}$); valid GSTIN checksums accepted and invalid rejected.

---

### Day 3: October 14, 2026 — High-Volume Retail POS Operations

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** 150+ simulated fast POS checkouts under Profile 1 (Ambica Supermarket); barcode lookups, mixed tender (Cash + UPI), Section 170 nearest-rupee cash rounding, and thermal slip generation.
- **Acceptance Criteria:** Latency $< 250\text{ms}$ per checkout; cash drawer balance in Day Book exactly matches physical cash intake; round-off adjustments $\le \pm 0.50$.

---

### Day 4: October 15, 2026 — POS Offline Sync & Network Interruption

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Simulate network offline mode with client-side UUID queue; execute batch synchronization via `POST /api/v1/invoices/pos-sync` under intermittent connection loss.
- **Acceptance Criteria:** Duplicate submissions rejected via `clientOfflineUuid` idempotency key; zero duplicate stock deductions; partial failures logged without corrupting transaction atomicity.

---

### Day 5: October 16, 2026 — Wholesale B2B Credit Sales & Invoicing

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** B2B credit sales invoices under Profile 2; sequential legal invoice number generation (`INV-202627-XXXX`); draft vs issued state transitions; batch allocations.
- **Acceptance Criteria:** Invoices posted to Sales Register; stock deducted from specified depot warehouse; Accounts Receivable debited and Sales/Output Tax credited.

---

### Day 6: October 17, 2026 — Bill-by-Bill Payment Allocation & Receivables

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Receipt vouchers posted against outstanding B2B invoices; partial payments, multi-bill matching, and credit limit validations.
- **Acceptance Criteria:** Outstanding invoice balances updated accurately; payment allocation total $\le$ invoice grand total; Party Ledger statement reflects accurate running balance.

---

### Day 7: October 18, 2026 — Inter-State IGST & Place of Supply Validation

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Inter-state taxable supplies from Gujarat (`24`) to Maharashtra (`27`), Rajasthan (`08`), and Karnataka (`29`) under Profile 3.
- **Acceptance Criteria:** Zero CGST/SGST charged; 100% IGST applied; customer GSTIN 2-digit state code matches invoice place of supply.

---

### Day 8: October 19, 2026 — Statutory Cancellations & Contra Stock Restorations

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Full cancellation of issued B2B invoices and POS retail tickets across Profiles 1, 2, and 3.
- **Acceptance Criteria:** Original invoices marked `CANCELLED`; contra reversing vouchers posted; stock restored via `SALES_CANCELLATION`; immutable audit trail recorded.

---

### Day 9: October 20, 2026 — Journal Vouchers & Accounting Period Locks

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Manual double-entry journal vouchers for accruals, depreciation, and bank charges; period lock enforcement for closed periods.
- **Acceptance Criteria:** Balanced vouchers enforced; backdated mutation attempts on locked dates rejected with HTTP 400/403.

---

### Day 10: October 21, 2026 — Inventory Valuation & Stock Ledger Auditing

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Verification of append-only stock transactions; item stock valuation under Periodic Average / FIFO policies; warehouse transfers between Head Office and APMC Depot.
- **Acceptance Criteria:** Physical stock balances match ledger movements; zero negative valuation rates.

---

### Day 11: October 22, 2026 — Statutory GST Reports (GSTR-1 / GSTR-3B)

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Compilation of GSTR-1 Table 4A (B2B), Table 5A (B2C Large), Table 7 (B2C Small), Table 12 (HSN Summary), Table 13 (Document Issued Summary).
- **Acceptance Criteria:** Exported JSON/CSV matches taxable turnovers, CGST, SGST, IGST liability to the exact paisa; cross-check against Sales Register.

---

### Day 12: October 23, 2026 — Financial Statement Reconciliation

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** End-to-end reconciliation of Trial Balance, Profit & Loss Statement, Balance Sheet, and Day Book across all 3 company profiles.
- **Acceptance Criteria:** Debits equal credits ($\Delta = 0.00$); Net Assets equal Liabilities + Equity + Net Profit; Day Book matches general ledger totals.

---

### Day 13: October 24, 2026 — High Concurrency & Rate Limiting Stress Test

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** 50 concurrent checkout and payment requests sent simultaneously; brute-force login attempts to trigger 429 rate limiting; tamper detection probe on audit log hash chain.
- **Acceptance Criteria:** Zero deadlocks or race conditions; HTTP 429 triggered on 6th failed login; audit chain tamper probe immediately flags modified records.

---

### Day 14: October 25–26, 2026 — Disaster Recovery, Backup Verification & Sign-Off

- **Status:** **SCHEDULED / PENDING**
- **Target Operations:** Execute automated database dump and restore using `./scripts/backup_restore_test.sh`; final reconciliation run across all 3 profiles; pilot review meeting.
- **Acceptance Criteria:** 100% schema and data fidelity; zero variance in financial balances; pilot sign-off documented.

---

## 3. Pending External Dependencies

The following external dependencies remain explicitly pending and cannot be assumed or bypassed:

| Dependency                                        | Owner                       | Requirement                                                                                                                                                                                                                   |              Status              |
| :------------------------------------------------ | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------: |
| **Chartered Accountant (CA) Statutory Review**    | External CA / Legal Counsel | Written validation of [CA Review Dossier](file:///home/dell/Jaydeep/Billing/docs/ca-review-dossier.md), covering Periodic Inventory (AS-2), Balance Sheet presentation, Section 170 round-off, and MCA Rule 3(1) audit trail. |           **PENDING**            |
| **Distributed Redis Throttler**                   | DevOps / Infrastructure     | Implementation of Redis storage provider for `@nestjs/throttler` if production deployment utilizes $>1$ API pod replica.                                                                                                      |           **PENDING**            |
| **Production Proxy CIDR Configuration**           | DevOps / Security           | Verification of `TRUST_PROXY` CIDR settings in production reverse proxy (Nginx / AWS ALB / Cloudflare).                                                                                                                       |           **PENDING**            |
| **14-Day Pilot Execution & Operational Sign-Off** | Pilot Lead / Operations     | Execution and logging of scheduled Days 2 through 14 across all three synthetic company profiles.                                                                                                                             | **IN PROGRESS** (Day 1 Complete) |

---

## 4. Release Gate Decision

- **Current Release Status:** **STAGING GO** / **CONDITIONAL PRODUCTION GO**
  - **STAGING GO**: Granted. The staging environment is technically hardened, isolated, and verified with 100% automated test passes and successful Day 1 pilot onboarding.
  - **CONDITIONAL PRODUCTION GO**: Commercial production launch is blocked pending completion of the CA statutory sign-off, Redis throttler deployment (if multi-pod), and completion of the 14-day staging pilot.
