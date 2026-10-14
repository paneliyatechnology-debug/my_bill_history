# GST Compliance Phase — Next Report

Date: 14 October 2026

This phase inspected the code and tests behind `GST_COMPLIANCE_PHASE_REPORT.md` and then hardened return preparation, reconciliation review, and sandbox gates. Production filing is not enabled. No IRN or e-way number was fabricated. The database was not reset. Migration `20261014153000_gst_supply_categories` was applied with `prisma migrate deploy`.

## What was verified in the existing code

- GSTR-1 and GSTR-3B are built in `packages/gst-provider` and loaded by `apps/api/src/reports/reports.service.ts`. `filingStatus` stays `NOT_FILED`.
- GSTR-2B import stores a SHA-256 per company, matches rows, and leaves ITC `UNREVIEWED`. A review writes `gstr2b_adjustments` and returns `accountingPosting: NONE`.
- The NIC client refuses production unless `productionEnabled` is set, and it stores an IRN only when the response has a 64-character hex IRN, acknowledgement number and date, and signed invoice and QR of at least 20 characters each.
- Sales tax for Gujarat invoices still posts CGST and SGST. Existing report totals were re-run and still pass.

## Statutory choices used

These are the rules the code follows. A chartered accountant should confirm them before a return is filed.

| Topic | Treatment in this codebase | Source used |
| --- | --- | --- |
| B2CL vs B2CS | Inter-state supply to an unregistered person is B2CL only when the invoice grand total is above ₹2,50,000. Smaller unregistered supplies, and all intra-state unregistered supplies, stay in B2CS. | GSTR-1 Table 5 instruction. Confirm the current portal instruction before filing. |
| UTGST vs SGST | Intra-territory supplies in Chandigarh 04, Dadra and Nagar Haveli and Daman and Diu 26, Lakshadweep 31, Andaman and Nicobar 35, and Ladakh 38 use CGST + UTGST. Delhi 07, Puducherry 34, and Jammu and Kashmir 01 stay SGST. Inter-state supplies stay IGST. | GST state codes and Section 2(8) of the UTGST Act. A later notification could change a code. |
| Portal `samt` | GSTR-1 item `samt` is SGST plus UTGST. `utgstIncludedInSamt` is returned beside it. Schema 1.1 has no separate UT amount field in the item block used here. | Portal JSON shape already used by this project. Do not treat `samt` as pure SGST when UTGST is present. |
| Nil, exempt, non-GST | Explicit `EXEMPT` goes to `expt_amt`, `NON_GST` to `ngsup_amt`, and `NIL_RATED` to `nil_amt`. A zero-tax line with no category is reported as nil and flagged unspecified. | GSTR-1 nil-rated table columns. Unspecified zero-rate rows need CA classification. |
| Advances | Goods advances are stored with zero tax and are not posted. Service advances calculate tax for GSTR-1 Table 11 and are stored as `NOT_POSTED_PENDING_CA`. | Notification No. 66/2017-Central Tax for goods. Section 13 of the CGST Act for the time of supply of services. The service-advance voucher is deliberately not posted, so the later invoice cannot be double-taxed by an unconfirmed entry. |
| ITC utilization | IGST credit is used against IGST first. Remaining IGST credit is not split between CGST and SGST/UTGST unless the caller passes `igstCreditAllocation`. CGST credit is not used for SGST/UTGST, and the reverse is also blocked. Cess credit is used only for cess. | Section 49(5) of the CGST Act and Rule 88A of the CGST Rules. |
| ITC claim | A GSTR-2B match does not accept ITC. `ACCEPTED` is allowed only for `MATCHED` or `PARTIAL_MATCH`. `INELIGIBLE` and `BLOCKED` purchase tax is excluded from books ITC. Draft GSTR-3B reports books ITC, reviewed/accepted ITC, pending review, and excluded amounts separately. | Section 16 eligibility is not decided by this software. |

## Changes

- `packages/accounting-core`: supply categories force non-taxable lines to zero tax. Intra-UT supplies split the rate into CGST and UTGST. Chart template adds Output UTGST `2140`. Existing companies get that ledger on the first UTGST sales posting if it is missing.
- `packages/gst-provider`: GSTR-1 nil table splits nil, exempt, and non-GST. B2CS and HSN `samt` include UTGST. Table 11 lists service advances and goods advances that are not taxed on receipt. GSTR-3B keeps exempt and non-GST apart, reports pending and excluded ITC, and settles accepted ITC through `settleItc`. `assertItcReview` blocks acceptance of missing, duplicate, and mismatch rows. IRP generate retries once on HTTP 401 or 5xx. A timeout looks up the document and returns `UNKNOWN` without storing an IRN when the lookup does not prove one.
- `packages/database`: additive migration adds `supply_category`, `utgst_amount` on sales and purchase documents, `outward_debit_notes`, `advance_receipts`, and `advance_adjustments`, with tenant RLS. Existing rows default to `TAXABLE` and zero UTGST.
- API: sales create and draft-issue persist UTGST and supply category and post Output UTGST. `POST /api/v1/gst/debit-notes` posts a balanced sales voucher and does not move stock. `POST /api/v1/gst/advances` and `POST /api/v1/gst/advances/:id/adjustments` do not post vouchers. GSTR-2B review calls `assertItcReview`. Reports load debit notes and advances. E-invoice and e-way generation are refused when the invoice has UTGST, because the current payload has no confirmed UT field.

## Tests run

- `@billing/gst-provider`: 13 tests passed (`gstr-compliance.spec.ts`, `nic-provider.spec.ts`).
- `@billing/accounting-core`: 31 tests passed.
- `@billing/api` `tsc --noEmit`: no errors under `src/`.
- API integration: `gst-compliance.integration.spec.ts` and `reports.integration.spec.ts`, 18 tests passed. The GST suite checks that a second import of the same file is `duplicateFile` with one import row, that a `MISSING_IN_BOOKS` row cannot be accepted, that an accepted match posts no voucher, and that another tenant sees no matched rows.

## Purchase UTGST, credential sealing, and sandbox gate

Date of this pass: 14 October 2026.

### Purchase tax

Inward tax is classified from the supplier GSTIN state and the place of supply. The recipient's registration state does not choose SGST, UTGST, or IGST.

- Same supplier state and place of supply in a state, or in Delhi, Puducherry, or Jammu and Kashmir: CGST + SGST, posted to Input CGST and Input SGST.
- Same supplier state and place of supply in Chandigarh, Dadra and Nagar Haveli and Daman and Diu, Lakshadweep, Andaman and Nicobar, or Ladakh: CGST + UTGST, posted to Input UTGST (`1140`), which is created if missing.
- Different supplier state and place of supply: IGST.
- A supplier GSTIN must pass the checksum and match the supplier's state. If the bill omits place of supply and the two states differ, the bill is rejected instead of assuming the buyer's state.
- Exempt, nil-rated, and non-GST item categories force the line tax to zero.
- Purchase returns reverse the tax stored on the original lines, including UTGST, in proportion to the returned quantity.

### Credentials

AES-256-GCM sealing is in `packages/gst-provider/src/secret-box.ts`, using Node's `crypto`. The key is `GST_CREDENTIALS_ENCRYPTION_KEY` (base64, 32 bytes) plus `GST_CREDENTIALS_KEY_ID`. A previous key pair can open older ciphertext. Sandbox and production ciphertext cannot be opened for each other. A missing, short, or wrong key fails closed. Ciphertext columns were added and left null. Existing environment secrets were not copied into the database. The API still rejects secrets in the request body and does not return ciphertext. Stored ciphertext, when present, is opened only in memory.

### Official schema

The NIC IRP attribute map says `SGST_UTGST_Amt` is `Item.SgstAmt` and the total is `ValDtls.SgstVal` (https://einv-apisandbox.nic.in/Mapping_of_technical_and_JSONattribute_names_for_IRN.html). The e-invoice payload now adds UTGST into those two fields. A contract test uses a local mock fixture and is marked `MOCK_NOT_A_LIVE_IRP_RESPONSE`.

Official authentication encrypts a base64 credential JSON with the IRP public key (https://einv-apisandbox.nic.in/version1.04/authentication.html). This client still sends the username, password, and app key as JSON. That is not the official encrypted auth envelope.

The e-way bill v1.03 sample uses `sgstValue` and does not say that field includes UTGST (https://docs.ewaybillgst.gov.in/apidocs/version1.03/generate-eway-bill.html). E-way generation stays blocked when the invoice has UTGST. The request body is also supposed to be encrypted with the session key. This client does not do that encryption.

### Sandbox

`docs/gst-sandbox-checklist.md` lists how to obtain sandbox credentials. Live HTTP is refused unless `GST_SANDBOX_LIVE=true`, and production hosts are refused by the HTTP client. No sandbox or production call was made. Production filing was not enabled.

### Commands and results

- `prisma migrate deploy` applied `20261014170000_purchase_utgst_and_secret_ciphertext`. The database was not reset.
- `@billing/accounting-core` tests: 32 passed.
- `@billing/gst-provider` tests: 17 passed, including secret-box, NIC parsing, and the IRP field fixture.
- API `tsc --noEmit`: no errors under `src/`.
- API integration: GST compliance 3 passed, purchases 5 passed, purchase returns 12 passed, reports 16 passed. The new GST test posts a Ladakh supplier bill with place of supply 38 to a Gujarat company, expects CGST 90 and UTGST 90, a balanced voucher, an Input UTGST debit, no Input SGST debit, and no visibility of that bill for the other tenant.
- `nest build` completed.
- `next build` completed. Existing `<img>` lint warnings on login, POS, and the app shell remain. They were not introduced here.

## Unresolved

- This phase is not complete for live filing. Production stays disabled. No sandbox or production call was made to NIC. IRP and e-way password encryption with the official public key is not implemented.
- E-way bills that contain UTGST stay blocked. The v1.03 sample does not document `sgstValue` as SGST plus UTGST.
- Whether a recipient registered outside the place of supply can claim the UTGST or SGST on that bill needs CA confirmation. The software records the difference and does not decide eligibility.
- Service-advance tax is preparation data only. No receipt or adjustment voucher is posted. A CA must confirm the entry before it hits the ledger.
- Outward debit notes post like a price debit to the customer ledger. They do not move stock. Stock-adjustment debit notes are not implemented.
- IGST credit left after the IGST liability is not auto-allocated. GSTR-3B cash payable stays unsplit until an allocation is supplied.
- Pre-existing type errors in `apps/api/test/real-ocr-hardening.spec.ts` were left unchanged.

## User-facing GST Compliance module

Date of this pass: 14 October 2026.

The authenticated app now has a GST Compliance group in the sidebar and matching pages. Every page reads the selected company from the existing tenant headers. Amounts come from the report and GST APIs. A downloaded draft stays `NOT_FILED`. No portal filing call was added. No migration was added in this pass. The database was not reset.

### Routes and navigation

Sidebar group **GST Compliance** (also shown in the existing mobile menu, which renders the same groups):

| Screen | Path |
| --- | --- |
| GST Dashboard | `/gst` |
| GSTR-1 | `/gst/gstr-1` |
| GSTR-3B | `/gst/gstr-3b` |
| GSTR-2B Reconciliation | `/gst/gstr-2b` |
| Purchase Register | `/gst/purchases` |
| E-Invoice / IRN | `/gst/einvoice` |
| E-Way Bill | `/gst/eway` |
| GST Reports | `/gst/reports` |
| GST Settings | `/gst/settings` |

Local URL: `http://localhost:3000/gst`. The API is `http://localhost:4000/api/v1`.

### Screens

- Dashboard: company name, GSTIN, financial year, month and year, sales taxable and outward tax, books / accepted / pending / excluded ITC, cash estimate, GSTR-1 and GSTR-3B `filingStatus`, GSTR-2B counts, stored IRN and e-way counts, and the last provider audit rows.
- GSTR-1: tabs for B2B, B2C large, B2C small, notes, nil/exempt/non-GST, and HSN. Searchable tables. A sales-invoice row links to `/sales/invoices/:id` when the document list has that number. The page does not edit posted invoices. JSON download is the draft returned by the API.
- GSTR-3B: outward, nil, exempt, non-GST, reverse charge, books ITC, accepted ITC, pending review, excluded ITC, utilization, and ledger tie-out. The page does not calculate tax itself.
- GSTR-2B: file preview, import, status filters, books versus portal comparison including UTGST, and accept / reject / defer with a reason. The response `accountingPosting` is shown. Matching does not claim ITC.
- Purchase register: posted bills and returns for the period, with CGST, SGST, UTGST, IGST, and cess, plus the stored ITC label. A linked GSTR-2B row is explained when the document number matches.
- E-invoice: issued invoices, payload value preview without credentials, generate only when credentials are `READY` and the recipient has a GSTIN. An IRN is shown only when the stored record has one.
- E-way: distance and vehicle are required in the form. UTGST invoices stay blocked. A number is shown only from a stored provider record.
- Settings: GSTIN from the company record, sandbox client id and username only, production left off, and a sandbox ping that does nothing unless `GST_SANDBOX_LIVE=true`. Secrets are not accepted in the form.

### APIs used

Existing: `GET /reports/gstr-1`, `GET /reports/gstr-3b`, `GET /reports/purchase-register`, `GET /gst/gstr-2b/summary`, `GET /gst/gstr-2b/reconciliations`, `POST /gst/gstr-2b/imports`, `POST /gst/gstr-2b/reconciliations/:id/review`, `GET /gst/gstr-2b/export`, `GET /gst/integration`, `PUT /gst/integration`, `POST /gst/einvoice/:invoiceId/generate`, `POST /gst/eway-bills/invoices/:invoiceId/generate`, `GET /gst/eway-bills/:ewbNumber`.

Added because no list existed: `GET /gst/documents`, `GET /gst/audit`, `POST /gst/integration/sandbox-ping`. The web client now sends both `idempotency-key` and `x-idempotency-key`.

### Files

- `apps/web/src/components/layout/app-shell.tsx`
- `apps/web/src/components/gst/gst-kit.tsx`
- `apps/web/src/app/gst/**/page.tsx`
- `apps/web/src/lib/api-client.ts`
- `apps/api/src/gst/gst.controller.ts`
- `apps/api/src/gst/gst-portal.service.ts`
- `apps/api/src/reports/reports.service.ts` and `reports.controller.ts` (purchase register period and UTGST, from the previous pass)
- `apps/api/test/gst-compliance.integration.spec.ts`

### Commands and results

- API `tsc --noEmit`: no errors under `src/`. Pre-existing errors in `real-ocr-hardening.spec.ts` remain.
- Web `tsc --noEmit`: passed.
- `vitest run test/gst-compliance.integration.spec.ts test/reports.integration.spec.ts --fileParallelism=false`: 20 passed. The new GST case checks company isolation on `/gst/documents`, audit rows, sandbox ping with `attempted: false` when `GST_SANDBOX_LIVE` is unset, purchase-register UTGST, GSTR-3B `NOT_FILED`, and no extra voucher from those reads.
- `nest build`: completed.
- `next build`: compiled and linted, then failed while collecting page data with `Cannot find module './65.js'` because a running `next dev` and the production build share `apps/web/.next`. After restarting `pnpm dev`, these routes returned HTTP 200: `/gst`, `/gst/gstr-1`, `/gst/gstr-3b`, `/gst/gstr-2b`, `/gst/purchases`, `/gst/einvoice`, `/gst/eway`, `/gst/reports`, `/gst/settings`. Existing `<img>` lint warnings on login, POS, and the app shell remain.
- Browser check while signed out: sidebar shows GST Compliance, `/gst/gstr-1` and `/gst/settings` render their headings and the sign-in message. A signed-in session on the restarted API loaded dashboard, GSTR-1, GSTR-3B, documents, audit, integration, and the 2B summary with HTTP 200. Click-through of import, review, and provider generate was not repeated in the browser. Those paths are covered by the API tests, and generate was not called against NIC.

### Status

| Area | Status |
| --- | --- |
| Navigation and the nine pages | Complete for the existing APIs |
| GSTR-1 and GSTR-3B drafts | Complete as local drafts. Filing is not implemented |
| GSTR-2B import and review | Complete for the supported JSON/CSV parser. Acceptance does not post a voucher |
| Purchase register | Complete for posted bills and returns in the selected period |
| E-invoice / e-way | Partial. Screens and gates are live. IRN and e-way numbers appear only after a real provider response. UTGST e-way stays blocked. Official auth and e-way encryption are not implemented |
| Portal filing | Not implemented. Status stays `NOT_FILED` |
| Production | Blocked until the existing gate and credentials are set |

### Manual check

1. Sign in and select the company.
2. Open `http://localhost:3000/gst`.
3. Set the month and year. The return period is `MMYYYY`.
4. Open GSTR-1 and GSTR-3B and confirm `NOT_FILED` and the draft notice.
5. On GSTR-2B, choose a JSON file, read the preview, then import. Import the same file again and confirm it is not duplicated.
6. Open a row. Accept only a matched or partial row, with a reason of at least 10 characters. Confirm the message says no voucher was posted.
7. Open the purchase register and compare a bill with its GSTR-2B row.
8. On e-invoice and e-way, confirm missing credentials or UTGST show a block, not a generated number.
9. On settings, save a sandbox client id and username. The ping should say no request was sent unless `GST_SANDBOX_LIVE=true` and sandbox credentials exist.

Restart, if the dev server was stopped: `pnpm dev` from the repository root. Web is port 3000. API is port 4000. Do not run `next build` while `next dev` is using the same `.next` directory.
