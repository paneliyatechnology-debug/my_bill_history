# Next implementation roadmap

Date: 14 October 2026

Priority follows data integrity, then billing, stock, accounting, payments, reports, GST, and integrations. GST screens already exist. They are not the next build.

Do not start a second sales, purchase, or GSTR engine. Extend the services named below.

## Done in this pass

Return documents no longer clamp `balanceAmount` at zero. Outstanding includes a non-zero balance, so a customer or supplier credit remains visible. Stock summary now returns `minStockLevel`, which the stock screen already compared. These are small corrections, not a new module.

## 1. Supplier bill settlement — done in this phase

Migration `20261014180000_purchase_payment_allocations` adds optional `purchase_invoice_id` on `payment_allocations` and requires exactly one of the sales-invoice or purchase-bill links. The database was not reset.

`POST /api/v1/purchases/:id/payments` settles one posted bill. `POST /api/v1/purchases/payments` allocates one payment across several bills of the same supplier. `GET /api/v1/purchases/:id/payments` returns the history. The purchase list at `/purchases` has a Pay action for a writer role.

A payment debits the supplier ledger and credits cash or bank inside one transaction. A cash discount, when sent, also credits Discount Received. Amounts above the remaining payable are rejected. There is no unallocated supplier advance. The same idempotency key returns the original voucher. A voucher-number collision rolls the bill balance back. A locked financial year is rejected.

Verified by `purchase-payments.integration.spec.ts` (6 passed) together with purchases (5), purchase returns (12), and reports (16). The stock-summary regression now expects `minStockLevel` `0.0000` on the sugar row.

## 2. Make invoice outstanding and the party ledger agree

Depends on: task 1, and the signed return balance now stored.

Work: define one rule. Either outstanding is the party ledger, or every ledger movement that affects a party also updates the related document. Show unallocated credits and negative return balances on the party statement and on outstanding. Leave aging for positive overdue invoices only, and label credits separately.

Files: `apps/api/src/reports/reports.service.ts`, `apps/web/src/app/reports/page.tsx`, `apps/api/test/reports.integration.spec.ts`.

Risk: changing the outstanding total will change numbers users already see. Add a fixture that has a receipt, a return, and an unallocated journal before changing the formula.

Acceptance: for one party, the outstanding net equals the party-ledger closing balance for the same date range. A second company still sees neither document.

## 3. Inventory cost that matches the stock report

Depends on: stock movements already written by sales, purchases, and returns.

Work: pick one method and implement it in posting, not only in a label. Weighted average on each inward movement is the smaller change. FIFO needs lot rows and a backfill rule when negative stock was allowed. Stop labeling the dashboard as WAC/FIFO until the chosen method is what `getStockSummary` sums.

Files: `apps/api/src/invoices/invoices.service.ts`, `apps/api/src/purchases/purchases.service.ts`, `packages/accounting-core`, `apps/api/src/reports/reports.service.ts`.

Risk: rewriting historical movement costs will change stock value. Apply the method to new movements and keep old rows unchanged, or revalue in a reviewed migration with a backup.

Acceptance: buy 10 at ₹100 and 10 at ₹120, sell 15, and assert the remaining quantity and value for the chosen method. A sales return restores that cost. Tenant B cannot see the movements.

## Later, in order

4. Refund of a negative invoice balance as an explicit payment voucher, so a cash refund is not implied by the credit note alone.
5. Low-stock list using `minStockLevel`, now that the summary returns it. A badge on the stock screen is not a reorder report.
6. Quotation as its own document that converts to a tax invoice without posting stock or tax while it is still a quote.
7. PDF or a print stylesheet for the invoice. Browser print already exists.
8. GST portal filing only after a real acknowledgement path exists. Do not mark `filingStatus` filed from a local download.
9. NIC production, IRP encryption, and e-way UTGST only after the official schema and credentials are confirmed.
10. Gujarati copy on the GST pages, using the same language switch as the rest of the app.

## Do not do next

- A second GST module or a second report calculator in the browser.
- Demo invoices to fill dashboards.
- Copying secrets into the database without the existing encryption key.
- Resetting the database to make a suite pass.
