# Project functionality audit

Date: 14 October 2026  
Repository: `/home/dell/Jaydeep/Billing`

This audit classifies what the current code and tests actually do. A page or an HTTP 200 is not treated as a working feature. `docs/architecture.md` and `docs/implementation-plan.md` still say the repository had no application code on 12 October 2026. That notice is stale. `PROJECT_COMPLETION_SCORECARD.md` marks every listed feature PASS at 100 percent. That scorecard is not accepted here.

## Architecture that exists

pnpm workspace and Turborepo. Apps: `apps/web` (Next.js 14) and `apps/api` (NestJS on Fastify). Packages: `database` (Prisma and PostgreSQL RLS), `accounting-core`, `gst-provider`, `shared-types`, `tsconfig`.

These blueprint packages are not in the workspace: `tax-engine`, `i18n`, `ui`, `print-agent`. GST math lives in `accounting-core` and `gst-provider`. There is no BullMQ worker, no separate PDF service, and no payment-gateway integration in the running apps.

Tenant context is `authorization` plus `x-organization-id` and `x-company-id`. Roles include company admin, accountant, and auditor.

## How to read the labels

- VERIFIED_WORKING: inspected implementation plus a passing automated test in this repository.
- PARTIALLY_IMPLEMENTED: a real path exists, and a required piece of the business workflow does not.
- UI_ONLY: a screen exists without the matching business effect.
- API_ONLY: an endpoint exists without a matching screen.
- BROKEN: the path runs and produces a wrong financial or stock result. The return-balance defect below was in this state and is fixed in this pass.
- NOT_IMPLEMENTED: no working path.
- BLOCKED_BY_EXTERNAL_CONFIGURATION: code exists and will not complete without outside credentials or a statutory decision.

## A. Billing

| Feature | Status | Evidence |
| --- | --- | --- |
| Sales invoice tax and posting | VERIFIED_WORKING | `invoices.service.ts` calculates tax, posts a balanced sales voucher, and moves stock. `sales-invoices.integration.spec.ts` and `sales-returns.integration.spec.ts` cover issue, numbering, and returns. |
| CGST, SGST, UTGST, IGST | VERIFIED_WORKING | Intra-state uses CGST+SGST. Intra-UT uses CGST+UTGST. Inter-state uses IGST. Covered by GST and purchase tests, including a Ladakh supplier bill. |
| Purchase bills | VERIFIED_WORKING | `purchases.service.ts` posts stock inward and a balanced purchase voucher. `purchases.integration.spec.ts` exists. Purchase-return tests also post a bill first. |
| Quotations and estimates | PARTIALLY_IMPLEMENTED | `PROFORMA_INVOICE` is an invoice category labeled “QUOTATION / ESTIMATE” on the invoice screen. It is not a separate quote that a customer accepts. Issuing a draft assigns a tax-invoice number. |
| Delivery challans | PARTIALLY_IMPLEMENTED | `delivery-challans.service.ts` and `/sales/delivery-challans` exist. A challan is not the same document as a tax invoice. Distribution tests cover transfers and challans. This audit did not re-run that suite. |
| Sales returns and credit notes | VERIFIED_WORKING | Quantity cannot exceed the remaining sold quantity. Stock and output tax reverse. `sales-returns.integration.spec.ts`: 9 passed, including the credit-balance case added in this pass. |
| Purchase returns and debit notes | VERIFIED_WORKING | `purchase-returns.integration.spec.ts`: 12 passed. Returns reverse the tax stored on the original bill, including UTGST. |
| Outward debit notes | API_ONLY | `POST /api/v1/gst/debit-notes` posts a sales voucher and does not move stock. No sales-screen workflow was found for it. |
| Invoice numbering, draft, issue, cancel | VERIFIED_WORKING | Advisory lock and `invoice_sequences` assign `INV/YY-YY/####`. Drafts do not post stock. Cancel reverses stock and posts a reversing voucher. Covered by sales invoice tests. |
| PDF and print | PARTIALLY_IMPLEMENTED | Invoice and sales-return screens call `window.print()`. No PDF file, email, or thermal ESC/POS output is generated. |
| Customer and supplier selection | VERIFIED_WORKING | Party master is used by sales and purchase create. GSTIN checksum is validated. |

## B. Inventory

| Feature | Status | Evidence |
| --- | --- | --- |
| Items, units, categories | VERIFIED_WORKING | Master screens and `masters.integration.spec.ts` exist. This pass did not re-run that file. |
| Stock on sales and purchase | VERIFIED_WORKING | Sales dispatch writes a negative `stock_transactions` row. Purchase writes a positive row. Returns reverse those movements in the return tests run this pass. |
| Warehouses | PARTIALLY_IMPLEMENTED | Warehouse master and stock filters exist. Sales posting uses the requested warehouse or the default warehouse. Multi-warehouse valuation is not a separate costing ledger. |
| Batches | PARTIALLY_IMPLEMENTED | Batch master exists. Sales and purchase posting do not require a batch, so expiry is not enforced at billing. |
| Stock adjustments | PARTIALLY_IMPLEMENTED | Opening and adjustment transaction types exist in the schema. No dedicated stock-adjustment screen was found that posts a balanced inventory voucher. |
| Valuation | PARTIALLY_IMPLEMENTED | Stock summary sums `totalValuation` on movements and falls back to `purchaseRate`. The dashboard text says WAC/FIFO. There is no FIFO lot depletion or cost-variance backfill in the sales posting path. |
| Low stock | PARTIALLY_IMPLEMENTED | The stock screen compares `closingQty` with `minStockLevel`, but the stock-summary API omitted that field, so the warning never appeared. This pass adds `minStockLevel` to the summary response. There is still no separate low-stock report. |
| Negative stock | VERIFIED_WORKING | When `company.allowNegativeStock` is false, issue and delivery challan block a quantity above on-hand stock. The default in the company model should be confirmed per company before go-live. |

## C. Accounting

| Feature | Status | Evidence |
| --- | --- | --- |
| Chart of accounts and ledgers | VERIFIED_WORKING | Template ledgers and ledger screens exist. `accounting.integration.spec.ts` is the historical evidence. Not re-run in this pass. |
| Sales and purchase vouchers | VERIFIED_WORKING | Both post balanced journals and update `currentBalance`. Return tests assert debit equals credit. |
| Customer receipt against invoices | VERIFIED_WORKING | `POST /invoices/sales/:id/payments` and receipt vouchers reject settlement above `balanceAmount`. Allocations are stored on `payment_allocations`, which relates only to `SalesInvoice`. |
| Supplier payment against bills | VERIFIED_WORKING | `POST /api/v1/purchases/:id/payments` and `POST /api/v1/purchases/payments` post a balanced payment voucher, store a purchase-bill allocation, and reduce `balanceAmount`. `purchase-payments.integration.spec.ts`: 6 passed, covering partial and full settlement, two bills in one payment, overpayment, another company, a locked year, concurrent settlement, idempotent replay, voucher-number rollback, and a return that leaves a supplier credit. Unallocated supplier advances are rejected. Purchase bills have no draft or cancelled status; a missing or other-company bill returns 404. |
| Expenses and income | PARTIALLY_IMPLEMENTED | Expense payment voucher debits an expense account and credits cash or bank. There is no income receipt that is not tied to a sales invoice. |
| Outstanding | PARTIALLY_IMPLEMENTED | Outstanding uses invoice `balanceAmount`. Party ledger uses journal lines. They can diverge when a return, advance, or unallocated voucher exists. After this pass, a negative invoice balance is included in outstanding instead of being dropped. Aging still lists only positive balances. |
| Trial balance, profit and loss, balance sheet | VERIFIED_WORKING | Report endpoints and `accounting-reconciliation.spec.ts` exist. Reports integration (16 tests) passed in this pass and covers several of these statements. A chartered accountant still has to sign the presentation. |
| Period lock and reversal | PARTIALLY_IMPLEMENTED | `validatePeriodAccess` blocks a locked financial year on invoice, purchase, and voucher posting. Reversal is append-only cancellation, not an edit of the original voucher. Not every document type was re-tested against a locked year in this pass. |
| Cash and bank | PARTIALLY_IMPLEMENTED | Cash and bank accounts are used as the debit or credit side of receipts and expenses. There is no bank reconciliation or UPI collection. |

## D. GST and compliance

| Feature | Status | Evidence |
| --- | --- | --- |
| Company GSTIN | PARTIALLY_IMPLEMENTED | Stored on the company and shown in GST settings. Settings do not edit the GSTIN. That remains on Company Settings. |
| GSTR-1 and GSTR-3B preparation | VERIFIED_WORKING as drafts | Built from posted documents. `filingStatus` is `NOT_FILED`. Reports tests passed. The GST screens call these endpoints. |
| Purchase register | VERIFIED_WORKING | Posted bills and returns for a date range, with UTGST. ITC on the row is a label, not a claim. |
| GSTR-2B import and review | VERIFIED_WORKING | Idempotent import, match statuses, and accept only for matched or partial rows. Review does not post a voucher. Covered by `gst-compliance.integration.spec.ts` in the previous pass (4 tests). |
| ITC eligibility | PARTIALLY_IMPLEMENTED | Books ITC, accepted ITC, pending review, and excluded ITC are separate. The software does not decide Section 16 eligibility. |
| E-invoice and e-way | BLOCKED_BY_EXTERNAL_CONFIGURATION | Screens and API exist. An IRN or e-way number is stored only from a provider response that meets the validation rules. Production calls are blocked. E-way with UTGST is blocked. Official IRP public-key encryption is not implemented. |
| Filing and statutory audit | NOT_IMPLEMENTED for portal filing | Local GST API audit rows exist. There is no GSTR filing acknowledgement. |

## E. Reports and user experience

| Feature | Status | Evidence |
| --- | --- | --- |
| Sales, purchase, stock, party, and accounting reports | VERIFIED_WORKING | `/reports` calls the report API. CSV export exists for the sales register and GSTR-2B. No Excel workbook export was found. |
| Search, filters, pagination | PARTIALLY_IMPLEMENTED | List screens and GST tables filter and page. Behavior is per screen, not one shared table system. |
| Loading, empty, and error states | PARTIALLY_IMPLEMENTED | GST pages and several masters handle these states. This audit did not click every screen while signed in. |
| English and Gujarati | PARTIALLY_IMPLEMENTED | Sidebar and many billing screens switch language in the client. It is not a shared `packages/i18n` dictionary, and newer GST pages are English only. |
| Roles and tenant isolation | VERIFIED_WORKING | Controllers use role guards. Return and GST tests show a second tenant receives 404 or an empty list. RLS policies exist in migrations. |
| Responsive layout | PARTIALLY_IMPLEMENTED | The app shell collapses navigation. A full mobile pass of billing screens was not repeated in this audit. |
| Bill scanner | PARTIALLY_IMPLEMENTED | Upload and confirm can create a purchase. The default provider can be a mock OCR engine. A mock extraction is not a verified reading of an arbitrary supplier bill. |

## Root causes

1. Design documents and the completion scorecard describe a finished product. The code is a working billing core with explicit gaps.
2. Document balances and ledger balances are updated in separate steps. Returns used to clamp the document at zero, so the ledger could show a credit the invoice list hid.
3. Supplier settlement was designed (`RecordPurchasePaymentDto`, payment voucher type) and never connected to purchase bills.
4. Inventory value is a sum of movement amounts, while the UI text promises FIFO or weighted-average costing.
5. GST filing and NIC production calls are intentionally not treated as done.
