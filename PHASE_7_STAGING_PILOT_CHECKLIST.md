# PHASE 7 — 14-DAY STAGING PILOT CHECKLIST

**Project:** Indian Billing & Accounting SaaS  
**Repository:** `/home/dell/Jaydeep/Billing`  
**Pilot Environment:** Staging Local Cluster (PostgreSQL 16, NestJS Fastify API, Next.js Web)  
**Execution Date:** 2026-10-13  

---

## 1. Infrastructure Prerequisites

| Component | Requirement | Staging Configuration | Status |
|---|---|---|:---:|
| **PostgreSQL Database** | PostgreSQL 16+ with Row-Level Security enabled | Local port 5432 (`billing_db`) | Verified |
| **API Server** | NestJS + Fastify with `trustProxy` loopback | Local port 4000 (`/api/v1`) | Verified |
| **Web Server** | Next.js 14 Responsive Frontend | Local port 3000 | Verified |
| **Distributed Cache / Rate Limiting** | Redis 7+ (required for multi-instance horizontal scaling) | Single-instance in-memory throttler active; Redis cluster optional for multi-node deployments | Documented Prerequisite |
| **Reverse Proxy / Ingress** | Nginx / Cloudflare with explicit CIDR trust | Configured via `TRUST_PROXY=127.0.0.1` | Verified |
| **Database Backup Storage** | Off-site S3 / Local mounted volume for daily SQL dumps | Local artifact storage `scratch/billing_db_backup.sql` | Verified |

---

## 2. 14-Day Pilot Schedule & Verification Log

### Day 1: Multi-Profile Onboarding & Provisioning — **[VERIFIED PASSED]**
*Evidence Command: `vitest run test/staging-pilot-day1.spec.ts` (4/4 passed)*
- [x] **Profile 1 (Retail / POS):** Provisioned `Shree Ambica Provision Store Pvt Ltd` (Trade: Ambica Supermarket, GSTIN: 24AAACA1111A1Z1). Verified warehouse, financial year, and chart of accounts.
- [x] **Profile 2 (Wholesale & Distribution):** Provisioned `Gujarat Agro-Commodities Trading LLP` (Trade: Krishi Mandi Wholesalers, GSTIN: 24BBBCB2222B1Z2).
- [x] **Profile 3 (Inter-State Machinery Spares):** Provisioned `Western Industrial Spares & Equipment Corporation` (Trade: Western Machinery Spares, GSTIN: 24CCCCD3333C1Z3).
- [x] **Isolation Check:** Verified cross-tenant query rejections (Tenant 2 cannot query Tenant 1 data).

---

### Day 2: Master Data Catalog & Multi-UOM Setup — **[PENDING SCHEDULED]**
- [ ] Bulk import of 100 FMCG and hardware items.
- [ ] Multi-UOM configuration (Bag $\rightarrow$ Kg, Box $\rightarrow$ Pcs) with conversion factor testing.
- [ ] HSN/SAC code mapping and GST tax slab assignment (0%, 5%, 12%, 18%, 28%).
- [ ] Batch tracking and expiry date entry for pharmaceutical/perishable items.

---

### Day 3: Purchase Inward & Supplier Khata Onboarding — **[PENDING SCHEDULED]**
- [ ] Recording 10 local (Intra-state) purchase bills with CGST + SGST.
- [ ] Recording 5 inter-state purchase bills with IGST.
- [ ] Verification of Input Tax Credit (ITC) ledger balances (`Input CGST`, `Input SGST`, `Input IGST`).
- [ ] Verification of physical stock inward in primary warehouse.

---

### Day 4: Retail POS Billing & Offline Cash Counter — **[PENDING SCHEDULED]**
- [ ] High-speed barcode scanning at retail counter.
- [ ] Cash, UPI QR, and Card mixed tender payment receipts.
- [ ] Instant thermal invoice print (80mm receipt format).
- [ ] Offline sales synchronization via indexedDB offline queue.

---

### Day 5: B2B Wholesale Tax Invoicing & Credit Limits — **[PENDING SCHEDULED]**
- [ ] Creating B2B tax invoices with customer GSTIN and state code verification.
- [ ] Credit limit enforcement (warning or block when invoice exceeds credit limit).
- [ ] Delivery Challan issuance and conversion to final Tax Invoice.
- [ ] E-Invoice / E-Way Bill JSON export structure verification.

---

### Day 6: Bill-by-Bill Customer Receipts & Bank Reconciliation — **[PENDING SCHEDULED]**
- [ ] Recording partial customer cheque and NEFT payments against specific invoices.
- [ ] Automated outstanding balance reduction on invoice card and customer Khata.
- [ ] Bank account statement reconciliation against recorded receipts.

---

### Day 7: Mid-Pilot Data Backup & Restoration Drill — **[PENDING SCHEDULED]**
- [ ] Automated execution of scheduled pg_dump snapshot.
- [ ] Test restore of Day 1–6 transactions into an isolated staging restore database.
- [ ] Hash-chain audit trail verification on all modified ledger accounts.

---

### Day 8: Sales Returns & Credit Note Handling — **[PENDING SCHEDULED]**
- [ ] Customer return of 2 units from Day 5 B2B invoice.
- [ ] Output GST reversal verification (CGST + SGST reversal).
- [ ] Inventory disposition check: Restocked vs Damaged vs Scrapped.
- [ ] Customer outstanding balance reduction verification.

---

### Day 9: Purchase Returns & Debit Note Handling — **[PENDING SCHEDULED]**
- [ ] Rejection and return of defective raw materials to supplier.
- [ ] Input Tax Credit (ITC) reversal ledger posting.
- [ ] Supplier payable account debit and debit note printout.

---

### Day 10: General Expenses, Salaries & Manual Journal Vouchers — **[PENDING SCHEDULED]**
- [ ] Office rent and electricity bill payment voucher entry.
- [ ] Staff salary expense provision and payment journal vouchers.
- [ ] Cash-to-bank cash withdrawal and deposit contra vouchers.

---

### Day 11: Inventory Stock Audit & Physical Adjustment — **[PENDING SCHEDULED]**
- [ ] Physical inventory count vs recorded book stock comparison.
- [ ] Stock adjustment journal for minor breakages/leakages.
- [ ] Reorder level and minimum stock alert notification testing.

---

### Day 12: Statutory GST Returns (GSTR-1 & GSTR-3B) Audit — **[PENDING SCHEDULED]**
- [ ] GSTR-1 Table 4 (B2B Taxable Invoices) generation.
- [ ] GSTR-1 Table 5 (B2C Large) and Table 7 (B2C Small) generation.
- [ ] GSTR-1 Table 9B (Credit/Debit Notes) reconciliation against posted returns.
- [ ] GSTR-3B Table 3.1 (Outward Taxable Supplies) and Table 4 (Eligible ITC) summary verification.

---

### Day 13: Financial Statement Closing & Profitability Reconciliation — **[PENDING SCHEDULED]**
- [ ] Trial Balance debit equals credit reconciliation.
- [ ] Profit & Loss statement revenue, COGS, gross margin, and net profit audit.
- [ ] Balance Sheet Assets == Liabilities + Equity validation.
- [ ] Cash flow statement operating and financing cash flows verification.

---

### Day 14: Final Pilot Review & Production Sign-Off — **[PENDING SCHEDULED]**
- [ ] Review of system performance, error logs, and correlation IDs for failed requests.
- [ ] Multi-device usability validation across desktop, tablet, and mobile.
- [ ] Chartered Accountant (CA) pilot audit and sign-off report archiving.
- [ ] Formal staging-to-production promotion approval.
