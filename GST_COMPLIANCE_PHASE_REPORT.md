# GST Compliance Phase Report

Audit date: 14 October 2026. Production e-invoice and e-way bill integration is **not complete**. No return was filed.

## Gap audit before the change

What was already in the repository:

- Line-level CGST/SGST for intra-state supplies and IGST for inter-state supplies in `packages/accounting-core/src/tax-calculator.ts`.
- Posted sales invoices, sales returns, purchase invoices, and purchase returns with tax amounts and ledger vouchers.
- GSTR-1 and GSTR-3B preparation endpoints. They were not filing integrations.
- E-invoice and e-way bill tables. IRN cancellation after 24 hours was blocked in the sales cancellation flow.
- Delivery-challan e-way payload validation. Without `NIC_EWAY_BILL_CLIENT_ID` it returned `NOT_CONFIGURED` and did not invent a bill number.

Gaps found in that code:

- GSTR-1 B2B lines omitted IGST. Unregistered inter-state invoices above ₹2,50,000 were folded into B2CS. Nil-rated documents were not separated. Credit notes were omitted from the HSN summary.
- GSTR-3B clamped each tax component at zero when credit notes exceeded outward supplies, which hid the excess. Every purchase tax amount was treated as eligible ITC.
- The purchase register endpoint returned a deferred empty payload even though purchase bills were posted.
- There was no GSTR-2B import, match status, review history, or ITC decision.
- There was no provider client, sandbox/production gate, idempotency log, or persistence rule that stores an IRN or e-way bill number only when the external API returns one.
- Advance-receipt tax and outward debit notes are not documents in the schema.
- The item master does not distinguish exempt, nil-rated, and non-GST supplies. Union territories are not split into UTGST.

## What this phase added

- GSTR-2B JSON and CSV import with GSTIN checksum checks, period checks, and in-file duplicate rejection.
- Matching on supplier GSTIN, normalized invoice number, document type, invoice date, taxable value, and CGST/SGST/IGST/cess. Statuses are `MATCHED`, `PARTIAL_MATCH`, `MISSING_IN_BOOKS`, `MISSING_IN_GSTR2B`, `DUPLICATE`, and `MISMATCH`.
- Normalization is uppercase with spaces and `/ - . _` removed. Leading zeros are kept.
- Exact match: same date and each amount within ₹1.00. Partial match: date within 3 days and each amount within the larger of ₹10.00 or 1% of the books taxable value. Anything outside that band with the same identity is a mismatch.
- Review adjustments and history. `ACCEPTED` is refused while the row is missing in GSTR-2B. A review does not post a voucher.
- ITC in the GSTR-3B draft is taken only from `ACCEPTED` review rows. Books ITC is still shown separately.
- GSTR-1 now includes IGST, B2CL, nil-rated rows, credit notes in HSN, and `filingStatus: NOT_FILED`.
- GSTR-3B no longer clamps a negative outward component to zero. It reports nil-rated and reverse-charge sections and compares output-tax ledgers with source documents.
- Purchase register lists posted bills and purchase returns. `itcClaimed` is false on every row.
- `packages/gst-provider` validates the e-invoice and e-way payloads and calls NIC-style sandbox or production URLs only when credentials resolve. Production stays off unless `productionEnabled` is stored and the caller sets `acknowledgeProductionGate`. Secrets are environment variables, not database columns. Missing credentials return `CREDENTIALS_UNAVAILABLE` and store no IRN or e-way bill number.

## Commands and results

| Command | Result |
| --- | --- |
| `prisma migrate deploy` | Applied `20261014140000_gst_compliance_phase` only. Existing rows were not wiped. |
| `pnpm --filter @billing/gst-provider test` | 9 passed |
| `vitest run test/gst-compliance.integration.spec.ts test/reports.integration.spec.ts` | 18 passed |
| `vitest run` purchases, purchase returns, sales invoices, sales returns, accounting, distribution | 99 passed |
| `pnpm --filter @billing/accounting-core test` | 29 passed |
| `pnpm --filter @billing/api build` | Passed |

The GST integration test imported a portal-shaped file, matched `INV/001` to `inv-001`, left ITC `UNREVIEWED` until an explicit accept, confirmed the voucher count did not change, and showed the other tenant an empty summary. Generating an IRN for an unknown invoice returned 404. Sending a client secret in the configuration body was rejected.

No live call was made to the NIC sandbox or production IRP. The provider tests use an injected HTTP client.

## Still unresolved

- Production and sandbox credentials are not configured. Production mode is off. This phase is not complete.
- GSTR-1 and GSTR-3B are preparation drafts. `filingStatus` remains `NOT_FILED`.
- Advance receipts, outward debit notes, ISD, import of goods, and amendment sections are not reconciled.
- Exempt versus nil versus non-GST, UTGST, and HSN UQC other than `NOS` need a data model and CA confirmation.
- GSTR-3B does not compute IGST cross-utilization, interest, or late fees.
- The e-invoice payload is the published INV-01 field set used by the NIC JSON. It still needs confirmation against the current IRP specification before any live submission.
- Section 17(5) blocked credits and Rule 42 reversals are not posted automatically.

## CA review

- Confirm the ₹1 exact-match and partial-match tolerances before relying on them for a working paper.
- Confirm that tax-rate zero documents may be called nil-rated until exempt and non-GST flags exist.
- Confirm whether purchase-return numbers should be matched to supplier credit-note numbers. The engine does that only when the normalized numbers are equal.
- Do not treat an `ACCEPTED` review as Section 16 eligibility. Possession, payment, and GSTR-2B reporting still have to be judged outside this flag.
- Do not enable production mode until the GSTIN is onboarded on the IRP and the sandbox evidence is accepted.

## Manual checks still required

1. Import a real GSTR-2B download for one return period and compare the summary counts with the portal.
2. Accept or defer each partial and mismatch row with a written reason.
3. Compare GSTR-1 taxable value and tax with the sales register and the output CGST, SGST, and IGST ledgers for the same dates. The API now returns `ledgerTieOut.variance`.
4. Place sandbox client id, username, secret, and password in the environment, save sandbox configuration, and generate one IRN only after the IRP returns it.
5. Restart the local dev server if it was running during this change. Dependencies were reinstalled.
