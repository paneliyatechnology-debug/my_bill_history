# 07 — Prioritized Development Roadmap (P0 to P3)

> **Audit Date:** October 14, 2026  
> **Repository:** `my_bill_history`  
> **Execution Strategy:** Phase-gated production readiness roadmap balancing statutory correctness with everyday retail billing speed.

---

## 1. Roadmap Prioritization Framework

- **`P0` — Critical Integrity & Compliance Gates:** Issues that could cause duplicate bill numbering, financial miscalculation, database collisions, or security risks.
- **`P1` — Essential Daily Retail Operations:** Mandatory capabilities required for a store cashier or wholesaler to run their shop every day without friction.
- **`P2` — Usability & Business Automation:** Features that save shopkeepers time, streamline customer communication, and prevent manual bookkeeping errors.
- **`P3` — Advanced Capabilities & Integrations:** Enterprise logistics, advanced manufacturing recipes, and live statutory government portal links.

---

## 2. Comprehensive Itemized Roadmap

### 2.1 Priority P0: Critical Security, Concurrency & Data Integrity

#### Task P0-1: Atomic Row-Locked Invoice Sequence Generation
- **Priority:** `P0`
- **Issue:** Concurrent billing submissions at high-volume retail counters can read identical sequence values, causing database constraint collisions.
- **Current State:** Sequence is read, incremented in Node.js memory, and upserted.
- **Relevant File Paths:**
  - [`apps/api/src/invoices/invoices.service.ts`](file:///c:/Billing/my_bill_history/apps/api/src/invoices/invoices.service.ts)
- **Required Changes:**
  Replace memory increment with PostgreSQL atomic row update:
  `UPDATE invoice_sequences SET current_value = current_value + 1 WHERE ... RETURNING current_value;`
- **Dependencies:** None.
- **Acceptance Criteria:**
  50 simultaneous parallel invoice POST requests generate strictly monotonic, sequential invoice numbers with zero duplicate key exceptions.
- **Testing Requirements:** Add Vitest concurrency test with `Promise.all(50 invoices)`.
- **Complexity:** `Small` (1 day).

---

#### Task P0-2: Shared Decimal Math on Browser Invoice Form
- **Priority:** `P0`
- **Issue:** Browser uses JavaScript standard floating point numbers, causing occasional visual penny discrepancies ($\pm ₹0.01$) against the backend `Decimal.js` calculation.
- **Current State:** Browser calculates using native numbers; backend recalculates using Decimal.
- **Relevant File Paths:**
  - [`apps/web/src/app/sales/invoices/new/page.tsx`](file:///c:/Billing/my_bill_history/apps/web/src/app/sales/invoices/new/page.tsx)
  - [`packages/accounting-core/src/tax-calculator.ts`](file:///c:/Billing/my_bill_history/packages/accounting-core/src/tax-calculator.ts)
- **Required Changes:**
  Import `@billing/accounting-core` calculation utilities into the Next.js form calculation helper.
- **Dependencies:** `@billing/accounting-core` build output.
- **Acceptance Criteria:**
  Fractional quantities and multi-tier tax calculations match the backend to the exact paise before form submission.
- **Testing Requirements:** Unit test line item calculation with fractional weights (e.g. 1.345 kg @ ₹278.50).
- **Complexity:** `Small` (1 day).

---

#### Task P0-3: API Request Idempotency Filter
- **Priority:** `P0`
- **Issue:** Rapid double-clicking on "Save & Print" creates duplicate invoices and double-deducts inventory.
- **Current State:** `apiClient` sends `idempotency-key`, but backend does not validate it.
- **Relevant File Paths:**
  - [`apps/api/src/common/interceptors/idempotency.interceptor.ts`](file:///c:/Billing/my_bill_history/apps/api/src/common/)
  - [`apps/api/src/invoices/invoices.controller.ts`](file:///c:/Billing/my_bill_history/apps/api/src/invoices/invoices.controller.ts)
- **Required Changes:**
  Create a NestJS `IdempotencyInterceptor` caching the response for 60 seconds by key.
- **Dependencies:** Redis / local in-memory LRU cache.
- **Acceptance Criteria:**
  Sending two identical POST requests with the same `x-idempotency-key` within 30 seconds returns the cached response without creating a second invoice.
- **Testing Requirements:** Integration test in `invoices.integration.spec.ts`.
- **Complexity:** `Medium` (2 days).

---

### 2.2 Priority P1: Essential Daily Retail Operations

#### Task P1-1: High-Speed Thermal Receipt Printing (2-inch & 3-inch)
- **Priority:** `P1`
- **Feature:** Fast receipt printing on 58mm / 80mm ESC/POS thermal printers used at billing counters.
- **Current State:** Invoice detail prints in standard A4 document layout only.
- **Relevant File Paths:**
  - [`apps/web/src/app/sales/invoices/[id]/page.tsx`](file:///c:/Billing/my_bill_history/apps/web/src/app/sales/invoices/[id]/page.tsx)
  - [`apps/web/src/styles/globals.css`](file:///c:/Billing/my_bill_history/apps/web/src/styles/globals.css)
- **Required Changes:**
  Add a `@media print` thermal template with fixed width (58mm/80mm), compact typography, store name, invoice number, items, total, and thank-you note.
- **Dependencies:** None.
- **Acceptance Criteria:**
  Cashier can click "Print Thermal" and directly print a receipt on any standard thermal printer without page cutoff.
- **Testing Requirements:** Print preview verification on physical or virtual thermal paper simulator.
- **Complexity:** `Small` (2 days).

---

#### Task P1-2: Dynamic UPI QR Code on Printed Bills
- **Priority:** `P1`
- **Feature:** Automatically generate and print an NPCI-compliant UPI QR code on every invoice.
- **Current State:** Missing.
- **Relevant File Paths:**
  - [`apps/web/src/app/sales/invoices/[id]/page.tsx`](file:///c:/Billing/my_bill_history/apps/web/src/app/sales/invoices/[id]/page.tsx)
  - [`apps/web/src/components/ui/upi-qr.tsx`](file:///c:/Billing/my_bill_history/apps/web/src/components/ui/)
- **Required Changes:**
  Generate standard UPI URI:
  `upi://pay?pa=<MerchantVPA>&pn=<StoreName>&am=<InvoiceTotal>&tr=<InvoiceNumber>&cu=INR`
  Render as QR code using `qrcode.react` on the invoice footer.
- **Dependencies:** Merchant UPI VPA setting in Company Settings.
- **Acceptance Criteria:**
  Scanning the printed bill's QR code in Google Pay, PhonePe, or Paytm automatically opens payment with the exact bill amount and invoice reference.
- **Complexity:** `Small` (1 day).

---

#### Task P1-3: One-Click WhatsApp Invoice Share
- **Priority:** `P1`
- **Feature:** Send invoice summary and PDF download link to the customer's WhatsApp number with one click.
- **Current State:** Missing.
- **Relevant File Paths:**
  - [`apps/web/src/app/sales/invoices/[id]/page.tsx`](file:///c:/Billing/my_bill_history/apps/web/src/app/sales/invoices/[id]/page.tsx)
- **Required Changes:**
  Add a "WhatsApp Bill" button that triggers `https://api.whatsapp.com/send?phone=91<CustomerPhone>&text=<EncodedMessage>`.
- **Dependencies:** None.
- **Acceptance Criteria:**
  Clicking the button opens WhatsApp Web or WhatsApp Mobile with pre-filled text in Gujarati or English showing store name, invoice number, amount, and payment link.
- **Complexity:** `Small` (1 day).

---

### 2.3 Priority P2: Usability & Business Automation

#### Task P2-1: Simplified Navigation & Merchant Dashboard Mode
- **Priority:** `P2`
- **Feature:** Allow shopkeepers to switch between "Simple Retail Mode" (Sale, Purchase, Items, Parties, Reports) and "Full Enterprise Mode" (BOM, Challans, Journals, Distribution).
- **Current State:** All 14 modules are shown in the main navigation.
- **Relevant File Paths:**
  - [`apps/web/src/components/layout/app-shell.tsx`](file:///c:/Billing/my_bill_history/apps/web/src/components/layout/app-shell.tsx)
  - [`apps/web/src/context/auth-context.tsx`](file:///c:/Billing/my_bill_history/apps/web/src/context/auth-context.tsx)
- **Required Changes:**
  Add a layout configuration toggle in settings: "Retail SME Mode" vs "Enterprise / Factory Mode".
- **Complexity:** `Medium` (2 days).

---

#### Task P2-2: Bulk Product & Party CSV / Excel Import
- **Priority:** `P2`
- **Feature:** Import existing product catalogs and customer phonebooks from Excel/CSV files.
- **Current State:** Manual item-by-item creation only.
- **Relevant File Paths:**
  - [`apps/web/src/app/masters/items/page.tsx`](file:///c:/Billing/my_bill_history/apps/web/src/app/masters/items/page.tsx)
  - [`apps/api/src/items/items.controller.ts`](file:///c:/Billing/my_bill_history/apps/api/src/items/items.controller.ts)
- **Required Changes:**
  Add a client-side Excel template parser (`xlsx`) with validation before bulk POST.
- **Complexity:** `Medium` (3 days).

---

### 2.4 Priority P3: Advanced Capabilities & Statutory Gateways

#### Task P3-1: Live GSP Production Integration for e-Invoice & e-Way Bill
- **Priority:** `P3`
- **Feature:** Live transmission of sales invoices $\ge ₹50,000$ to NIC e-Way portal and B2B invoices $\ge ₹5\text{ Cr}$ to IRP portal.
- **Current State:** Schema and NIC client are written in `@billing/gst-provider`; requires live GSP credentials.
- **Relevant File Paths:**
  - [`packages/gst-provider/src/nic-provider.ts`](file:///c:/Billing/my_bill_history/packages/gst-provider/src/nic-provider.ts)
  - [`apps/api/src/gst/gst-portal.service.ts`](file:///c:/Billing/my_bill_history/apps/api/src/gst/gst-portal.service.ts)
- **Required Changes:**
  Configure live GSP auth endpoint, configure SSL certificates, and execute live sandbox certification.
- **Complexity:** `Large` (5 days).

---

## 3. Implementation Complexity & Effort Summary

| Priority | Feature / Task | Complexity | Estimated Effort |
| :--- | :--- | :--- | :--- |
| **P0** | Row-Locked Invoice Sequence Generator | Small | 1 Day |
| **P0** | Shared Decimal Math on Browser Form | Small | 1 Day |
| **P0** | API Request Idempotency Interceptor | Medium | 2 Days |
| **P1** | Thermal Receipt Printing (58mm/80mm) | Small | 2 Days |
| **P1** | Dynamic NPCI UPI QR Code on Bill | Small | 1 Day |
| **P1** | 1-Click WhatsApp Invoice Share | Small | 1 Day |
| **P2** | Simplified Retail Navigation Mode | Medium | 2 Days |
| **P2** | Excel / CSV Bulk Item & Party Import | Medium | 3 Days |
| **P3** | Live GSP / NIC Government Portal Certification | Large | 5 Days |
