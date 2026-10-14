# Frontend UI/UX & Repository Audit (Phases 1–6)

**Project:** Indian Billing & Accounting SaaS (`/home/dell/Jaydeep/Billing`)  
**Audit Date:** 2026-10-12  
**Target Scope:** Complete, integrate, and polish the UI/UX for all backend functionality implemented in **Phases 1–6**. Strictly exclude Phase 7+ (Procurement, Manufacturing, Live GSP portal filing).

---

## 1. Executive Summary

A comprehensive repository audit was conducted across the backend API (`apps/api`), database schema (`packages/database`), core accounting package (`packages/accounting-core`), and the frontend application (`apps/web`).

- **Backend Status (Phases 1–6):** Fully implemented with 125 backend integration tests passing across 10 suites and 29 unit tests passing in `@billing/accounting-core`.
- **Frontend Status Prior to UI Build:**
  - `apps/web/src/app/page.tsx` (Dashboard) contained static links and hardcoded figures.
  - `apps/web/src/app/reports/page.tsx` contained static placeholder tables without active API integration.
  - No authentication, tenant switching, master data (parties, items, UOM, categories, batches, warehouses), double-entry accounting (COA, ledgers, vouchers), sales invoices, payments, POS, or inventory stock management screens existed in `apps/web`.
  - No unified application shell (sidebar, header, tenant/company selector, breadcrumbs, responsive drawer) was implemented.

---

## 2. Comprehensive Module & Route Audit Matrix

Status Legend:

- **Status 1:** Complete UI connected to the real API.
- **Status 2:** Partial UI with missing actions or states.
- **Status 3:** UI using placeholder, hardcoded or mock data.
- **Status 4:** No UI at all.
- **Status 5:** Backend implementation intentionally deferred to Phase 7+.

| Phase         | Module / Feature                      | Backend Endpoints                                                                                                                                                                | Audit State Prior             | Target Route                                         | Target State               | Notes                                                                                                     |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Phase 1–2** | User Login & Session                  | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me`                                                                                                                               | Status 4 (No UI)              | `/login`                                             | Status 1                   | Includes demo credentials, JWT persistence, error handling                                                |
| **Phase 1–2** | Tenant / Company Switcher             | `GET /api/v1/tenants/companies`<br>`GET /api/v1/tenants/branches`<br>`GET /api/v1/tenants/financial-years`<br>`POST /api/v1/auth/switch-context`                                 | Status 4 (No UI)              | Header / App Shell                                   | Status 1                   | Server-verified tenant context with active headers (`x-company-id`, `x-branch-id`, `x-financial-year-id`) |
| **Phase 3**   | Party Masters (Customers & Suppliers) | `GET /api/v1/parties`<br>`POST /api/v1/parties`<br>`GET /api/v1/parties/:id`<br>`PUT /api/v1/parties/:id`<br>`PATCH /api/v1/parties/:id/archive`<br>`DELETE /api/v1/parties/:id` | Status 4 (No UI)              | `/masters/parties`                                   | Status 1                   | Search, type filter, GSTIN validator, state codes, opening balance                                        |
| **Phase 3**   | Item Catalog                          | `GET /api/v1/items`<br>`POST /api/v1/items`<br>`GET /api/v1/items/:id`<br>`PUT /api/v1/items/:id`<br>`DELETE /api/v1/items/:id`<br>`GET /api/v1/items/lookup`                    | Status 4 (No UI)              | `/masters/items`                                     | Status 1                   | Bilingual names, HSN/SAC, UOM, tax rate, stock thresholds                                                 |
| **Phase 3**   | Units of Measure (UOM)                | `GET /api/v1/units`<br>`POST /api/v1/units`                                                                                                                                      | Status 4 (No UI)              | `/masters/units`                                     | Status 1                   | Indian standard GST units (BAG, BOX, KGS, NOS, etc.)                                                      |
| **Phase 3**   | Item Categories                       | `GET /api/v1/categories`<br>`POST /api/v1/categories`                                                                                                                            | Status 4 (No UI)              | `/masters/categories`                                | Status 1                   | Category hierarchy and bilingual naming                                                                   |
| **Phase 3**   | Item Batches                          | `GET /api/v1/batches`<br>`POST /api/v1/batches`                                                                                                                                  | Status 4 (No UI)              | `/masters/batches`                                   | Status 1                   | Batch number, manufacturing/expiry date, MRP                                                              |
| **Phase 3**   | Warehouses                            | `GET /api/v1/tenants/warehouses`<br>`POST /api/v1/tenants/warehouses`                                                                                                            | Status 4 (No UI)              | `/masters/warehouses`                                | Status 1                   | Multi-warehouse support and default warehouse tagging                                                     |
| **Phase 4**   | Chart of Accounts                     | `GET /api/v1/ledger-groups`<br>`POST /api/v1/ledger-groups`<br>`POST /api/v1/ledger-groups/seed`                                                                                 | Status 4 (No UI)              | `/accounting/chart-of-accounts`                      | Status 1                   | Standard Indian SME seed button, group hierarchy                                                          |
| **Phase 4**   | Ledger Accounts                       | `GET /api/v1/ledgers`<br>`POST /api/v1/ledgers`<br>`GET /api/v1/ledgers/:id`<br>`PATCH /api/v1/ledgers/:id`<br>`DELETE /api/v1/ledgers/:id`                                      | Status 4 (No UI)              | `/accounting/ledgers`                                | Status 1                   | Group assignment, opening balance, active/inactive                                                        |
| **Phase 4**   | Voucher Entry & Journal               | `GET /api/v1/vouchers`<br>`POST /api/v1/vouchers`<br>`GET /api/v1/vouchers/:id`<br>`POST /api/v1/vouchers/:id/reverse`                                                           | Status 4 (No UI)              | `/accounting/vouchers`<br>`/accounting/vouchers/new` | Status 1                   | Live Total Dr == Total Cr validation, immutable posting, reversal                                         |
| **Phase 5**   | Sales Invoices List                   | `GET /api/v1/invoices/sales`                                                                                                                                                     | Status 4 (No UI)              | `/sales/invoices`                                    | Status 1                   | Filter by status (DRAFT, ISSUED, PAID, CANCELLED), search                                                 |
| **Phase 5**   | Sales Invoice Entry                   | `POST /api/v1/invoices/sales`                                                                                                                                                    | Status 4 (No UI)              | `/sales/invoices/new`                                | Status 1                   | Party picker, multi-item grid, tax calculation, Section 170 round-off                                     |
| **Phase 5**   | Sales Invoice Detail & Actions        | `GET /api/v1/invoices/sales/:id`<br>`POST /api/v1/invoices/sales/:id/issue`<br>`POST /api/v1/invoices/sales/:id/cancel`                                                          | Status 4 (No UI)              | `/sales/invoices/[id]`                               | Status 1                   | A4 print layout, issue draft, authorized cancellation                                                     |
| **Phase 5**   | Bill-by-Bill Payments                 | `POST /api/v1/invoices/sales/:id/payments`<br>`GET /api/v1/invoices/sales/:id/allocations`                                                                                       | Status 4 (No UI)              | `/sales/invoices/[id]` (Payment Modal)               | Status 1                   | Cash/Bank account deposit, reference no, allocations display                                              |
| **Phase 5**   | POS Engine                            | `POST /api/v1/invoices/pos-checkout`<br>`POST /api/v1/invoices/pos-sync`                                                                                                         | Status 4 (No UI)              | `/sales/pos`                                         | Status 1                   | Fast touch UI, barcode lookup, quick tender, offline queue status                                         |
| **Phase 5**   | Stock Summary & Ledger                | `GET /api/v1/invoices/stock/transactions`<br>`GET /api/v1/invoices/items/:id/stock-movements`                                                                                    | Status 4 (No UI)              | `/inventory/stock`<br>`/inventory/movements`         | Status 1                   | Physical stock balances, item-wise movement audit trail                                                   |
| **Phase 6**   | Reports Center                        | `GET /api/v1/reports/*` (14 endpoints)                                                                                                                                           | Status 3 (Static mock tables) | `/reports`                                           | Status 1                   | All 14 endpoints wired to live backend, live CSV export, date filters                                     |
| **Phase 6**   | Purchase Register                     | `GET /api/v1/reports/purchase-register`                                                                                                                                          | Status 3                      | `/reports?tab=purchase-register`                     | Status 5 (Honest Deferred) | Backend returns `{ deferred: true }`. UI shows clear Phase 7 deferred badge                               |
| **Phase 6**   | GSTR-1 Return Preparation             | `GET /api/v1/reports/gstr-1`<br>`GET /api/v1/reports/gst-summary`                                                                                                                | Status 3                      | `/reports?tab=gstr-1`                                | Status 1                   | B2B, B2CL, B2CS, HSN summaries; clearly marked as Preparation (not portal filing)                         |
| **Overview**  | Executive Dashboard                   | Aggregated from Reports & Invoices APIs                                                                                                                                          | Status 3 (Static mockup)      | `/`                                                  | Status 1                   | Live sales totals, outstanding balances, recent invoices, shortcuts                                       |

---

## 3. UI/UX Architecture Plan

### 3.1 Design System & Shell

- Modern Indian Accounting SaaS visual language (Vyapar & Miracle inspired).
- Clean slate/emerald palette, tabular numerical font alignment, Indian currency symbol `₹`, lakh/crore formatting where applicable.
- Full bilingual English and Gujarati label support (`en` / `gu`).
- Top header: Active Company, Branch, Financial Year, Language switcher, Logged-in User, Logout.
- Left sidebar: Collapsible with categorized links (Dashboard, Masters, Sales, Accounting, Inventory, Reports, Settings).
- Mobile & Tablet: Drawer layout, no horizontal scroll on standard layouts, scrollable table containers with sticky headers.

### 3.2 Security & Tenant Isolation Invariants

- API requests route through a unified `apiClient` helper.
- Authenticated JWT token and tenant context headers (`x-organization-id`, `x-company-id`, `x-branch-id`, `x-financial-year-id`) are automatically injected.
- In unauthorized or token-expired scenarios, redirect to `/login` with an informative toast message.
- Strictly adhere to backend authority: client never calculates definitive tax or sequence numbers; it uses authoritative server responses.
