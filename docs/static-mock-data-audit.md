# Static & Mock Data Repository Audit — Billing SaaS

**Project:** Billing SaaS (`/home/dell/Jaydeep/Billing`)  
**Audit Date:** October 2026  
**Auditor:** Principal Software Architect & Senior Full-Stack Engineer  
**Scope:** `apps/web`, `apps/api`, shared packages, Prisma schema, migrations, seed scripts, and services.

---

## 1. Executive Summary

This repository was audited end-to-end to detect, catalog, and remediate all unauthorized static, mock, demo, and fabricated business data across the full stack. The goal was to ensure that **100% of production business data flows** derive strictly from the PostgreSQL database (via Prisma with Row-Level Security), authenticated multi-tenant backend APIs, or genuine external service providers (e.g., live GSP/GSTIN lookups, OCR pipelines).

### Audit Scope Coverage
- **Frontend Pages & Components:** All 38 Next.js routes under `apps/web/src/app`, UI components, forms, tables, modals, selectors, and contexts.
- **Backend Services & Controllers:** All NestJS modules under `apps/api/src` (invoices, vouchers, ledger, reports, parties, inventory, manufacturing, scanner, gst).
- **Prisma & Database:** `packages/database/prisma/schema.prisma`, seed scripts, RLS policies, migrations.
- **External Integrations:** GSTIN lookup providers (Appyflow, GSTINAPI, sandbox), Document OCR engines (Tesseract, pdftotext, Gemini), payment gateways.

---

## 2. Methodology & Inspection Criteria

Every component and data flow was inspected against strict criteria:
1. **No Fabricated Business Entities:** No hardcoded customer names, supplier names, GSTINs, company names, addresses, or phone numbers in production logic.
2. **No Fallback Mock Invoices or IDs:** No randomly generated or placeholder IDs (e.g., `POS-${Date.now()}`) replacing authoritative database records.
3. **No Arbitrary Form Pre-population:** Input forms must default to empty strings, zero amounts, or real catalog defaults—never arbitrary financial amounts (e.g., ₹1,000 debit/credit lines).
4. **No Disguised Unimplemented Features:** Any missing external credential must return an actionable configuration-required state rather than silent mock success.
5. **Legitimate Static Data Distinction:** Statutory rules (Section 170 CGST rounding, tax rates 0%, 5%, 12%, 18%, 28%), chart-of-accounts hierarchies, UI label translations (English/Gujarati), and type enums were audited and explicitly preserved.

---

## 3. Comprehensive Inventory of Findings

| Module | File Location | Confirmed Issue | Classification | Severity | Remediated? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Parties / GSTIN** | `apps/api/src/parties/parties.service.ts:32-75` | `KNOWN_GSTIN_REGISTRY` mock database populated with sample companies (e.g., ABC Electronics, Reliance Retail) was used in fallback paths. | Fabricated Mock Data | **High** | **YES** (Strictly gated behind `NODE_ENV === "test"`; production uses statutory derivation with empty names or live GSP) |
| **OCR Scanner** | `apps/api/src/purchases/scanner/providers/ocr-provider.factory.ts:25-33` | `MockOcrProvider` was returned if no OCR provider was configured, faking invoice extraction. | Mock Provider Fallback | **High** | **YES** (Strictly gated behind `NODE_ENV === "test"`; production falls back to `local` pixel OCR via `pdftotext` + Tesseract) |
| **POS Terminal** | `apps/web/src/app/sales/pos/page.tsx:219` | On checkout completion, UI fell back to generating random `POS-${Date.now()}` invoice number if response field was empty. | Fabricated Invoice Number | **Medium** | **YES** (Bound strictly to backend authoritative `res?.invoiceNumber \|\| "—"`) |
| **Dashboard** | `apps/web/src/app/page.tsx:128, 147` | Hardcoded fallback company name `"Trading Enterprise"` and FY `"2026-27"`. | Static Mock Entity | **Low** | **YES** (Dynamically bound to `currentCompany?.name` and `currentFY?.name` from `TenantContext`) |
| **Accounting Vouchers** | `apps/web/src/app/accounting/vouchers/new/page.tsx:44-50` | Form initialized with hardcoded ₹1,000 debit and ₹1,000 credit rows. | Fabricated Financial Defaults | **Medium** | **YES** (Rows initialize with clean empty `""` debit/credit values) |
| **Delivery Challans** | `apps/web/src/app/sales/delivery-challans/page.tsx:43, 75` | Initial item line hardcoded to HSN `"1006"`, description `"Goods for Job Work"`, qty `10`, price `100`, tax `5`. | Static Placeholder Business Record | **Medium** | **YES** (Bound to real selected catalog item fields) |
| **Stock Transfers** | `apps/web/src/app/inventory/transfers/page.tsx:39` | Transfer row defaulted to arbitrary quantity `10`. | Hardcoded Quantity | **Low** | **YES** (Defaulted to `1`) |
| **Manufacturing** | `apps/web/src/app/manufacturing/orders/page.tsx:32` | Work order form defaulted to arbitrary target quantity `100`. | Hardcoded Quantity | **Low** | **YES** (Bound dynamically to selected BOM's `batchYieldQty \|\| 1`) |
| **Financial Reports** | `apps/web/src/app/reports/page.tsx` | Raw JSON `<pre>` dumps were shown for multiple reports (Receipt-Payment, Party Aging, Day Book, Cash Flow, GSTR-3B). | Raw / Unformatted Data Display | **Medium** | **YES** (Implemented 8 dedicated, responsive, bilingual reports backed by authoritative API) |

---

## 4. Detailed Module Analysis

### 4.1 GSTIN Verification & Auto-population Flow
- **Trace:** `POST /api/parties/lookup-gstin/:gstin` -> `PartiesController.lookupGstin` -> `PartiesService.lookupGstin`
- **Audit:** Previously, unconfigured environments fell back to a hardcoded dictionary (`KNOWN_GSTIN_REGISTRY`) containing mock companies.
- **Resolution:**
  - `KNOWN_GSTIN_REGISTRY` restricted strictly to `process.env.NODE_ENV === "test"`.
  - In production without external GSP credentials, the service performs statutory validation: verifies state code (01-38), extracts PAN (chars 3-12), entity type (4th character), check digit checksum (Mod-36 Luhn-variant algorithm).
  - Business details (`legalName`, `tradeName`, `address`) remain blank, prompting user entry rather than injecting fake corporate identities into accounting ledgers.

### 4.2 OCR & Bill Scanner Flow
- **Trace:** `POST /api/purchases/scan` -> `PurchaseScannerService.scanBill` -> `OcrProviderFactory.getProvider`
- **Audit:** When `OCR_PROVIDER` was missing or unrecognized, `MockOcrProvider` fabricated a full invoice (vendor: "Sample Tech Pvt Ltd", items, GST breakdown).
- **Resolution:**
  - `MockOcrProvider` restricted strictly to `NODE_ENV === "test"`.
  - Default production fallback set to `local` (`LocalDocumentOcrProvider`), leveraging `pdftotext` (poppler) and `tesseract.js` for authentic document text extraction.
  - If local extraction fails or document is unreadable, returns clear error status rather than synthetic invoice totals.

### 4.3 Point of Sale (POS) Offline & Online Checkout
- **Trace:** `POST /api/invoices/pos-checkout` -> `InvoicesService.posCheckout`
- **Audit:** Frontend generated pseudo-invoice numbers `POS-${Date.now()}` on fallback.
- **Resolution:**
  - Frontend displays authoritative `res?.invoiceNumber` directly from the database transaction.
  - Backend enforces idempotency using `clientOfflineUuid` and database unique constraints.
  - Correct payment-mode ledger routing verified for `CASH`, `UPI`, `CARD`, and split tender.

### 4.4 Multi-Tenant Context & Dashboard
- **Trace:** `GET /api/reports/dashboard` -> `TenantContext` -> `apps/web/src/app/page.tsx`
- **Audit:** Default fallback strings `"Trading Enterprise"` and `"2026-27"` appeared if context took time to load.
- **Resolution:**
  - Context bindings directly read `currentCompany?.name` and `currentFY?.name`.
  - Dynamic loading skeletons displayed while company context resolves.

### 4.5 Financial Reports & Statutories
- **Trace:** `GET /api/reports/:type` -> `ReportsService` -> `apps/web/src/app/reports/page.tsx`
- **Audit:** 8 reporting endpoints returned structured financial data that the frontend dumped as unformatted JSON objects inside `<pre>` tags.
- **Resolution:**
  - Implemented 8 dedicated UI views:
    1. Receipt & Payment Summary (Opening cash, collections, disbursements, closing balance)
    2. Customer/Vendor Aging (Bucket breakdowns: Current, 1-30, 31-60, 61-90, 90+ days, accrued interest)
    3. Profit & Loss Statement (Gross sales, direct expenses, operating profit, net profit)
    4. Balance Sheet (Assets, Liabilities, Equities, net profit carry-forward)
    5. Cash Flow Statement (Operating, Investing, Financing activities)
    6. Day Book / Rojmel (Chronological cash and bank movement register)
    7. Stock Movement & Ledger (Opening balance, Inwards, Outwards, On-hand closing)
    8. GSTR-3B Taxable Summary (Table 3.1 outward supplies, Table 4 ITC, Table 6.1 tax payable)

---

## 5. Legitimate Static Data Preserved

The following static constants were confirmed as legitimate domain logic and intentionally preserved:
1. **GST State Codes & Union Territories:** 38 statutory 2-digit state prefixes (01 Jammu & Kashmir to 38 Ladakh).
2. **Standard Indian Chart of Accounts (COA):** Seeded hierarchy of standard accounting groups and ledger accounts (Assets, Liabilities, Equity, Revenue, Direct Expenses, Indirect Expenses, Duties & Taxes).
3. **Statutory GST Tax Brackets:** Standard 0%, 5%, 12%, 18%, 28% tax rates and HSN/SAC statutory descriptions.
4. **Section 170 Indian CGST Act Rounding Rules:** Mathematical nearest whole rupee rounding for final invoice totals.
5. **UI Bilingual Terminology:** English / Gujarati accounting terms (e.g., Rojmel, Kachu Sarvaiyu, Jama, Udhar) required for regional SME usability.
6. **Payment Mode Identifiers:** Domain enum constants (`CASH`, `UPI`, `CARD`, `NET_BANKING`, `CHEQUE`).

---

## 6. Audit Conclusion

The entire codebase has been systematically audited. All confirmed instances of mock fallbacks, synthetic business identities, and arbitrary form pre-population have been eliminated. Production flows are strictly backed by the database, authenticated APIs, and real statutory validation logic.
