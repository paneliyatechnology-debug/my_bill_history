# End-to-end business workflows

Date: 14 October 2026

Each workflow is the path that exists today: screen, API, database, stock, ledger, and reports. Missing links are called out at the end of the workflow.

## Workflow 1 — Sales

1. The user opens `/sales/invoices/new`, selects a party and items, and saves.
2. `POST /api/v1/invoices/sales` in `invoices.service.ts` checks the party, item, financial year, and stock when the company disallows negative stock.
3. `calculateSalesInvoiceTaxes` sets taxable value, CGST, SGST or UTGST, IGST, cess, and nearest-rupee round-off.
4. A draft stores the invoice and does not move stock or post a voucher. Issue, including `POST /api/v1/invoices/sales/:id/issue`, assigns the next `INV/…` number under an advisory lock.
5. For a goods line, a negative `stock_transactions` row is written. The valuation on that row is the item purchase rate, not a consumed FIFO layer.
6. A sales voucher debits the customer or cash, and credits sales, output tax, and round-off. Journal lines must balance before insert. Ledger `currentBalance` is updated.
7. An unpaid invoice keeps `balanceAmount` equal to the grand total. A cash invoice stores balance zero and status `PAID`.
8. Sales register, outstanding, party ledger, trial balance, and GSTR-1 read these posted rows.

Missing or weak links:

- There is no separate accepted quotation. A proforma is an invoice category.
- Print is the browser print dialog.
- A cash sale that is later returned does not automatically pay cash back. The credit stays on the customer ledger and, after this pass, as a negative invoice balance.
- Stock cost on the sale is not a FIFO issue, so inventory value and the trading account can disagree with a true cost layer.

## Workflow 2 — Purchase

1. The user opens `/purchases` and posts a bill, or confirms a scanned bill.
2. `POST /api/v1/purchases` resolves inward tax from the supplier GSTIN state and the place of supply. The buyer’s state is not the tax type.
3. The bill, lines, positive stock movements, and a purchase voucher are stored in one tenant transaction. Input CGST, SGST, UTGST, or IGST is debited only for the tax that was calculated. Exempt, nil, and non-GST lines store zero tax.
4. `balanceAmount` starts at the grand total. `paidAmount` stays zero. Nothing in the purchase API reduces that balance for a payment.
5. The purchase register, stock summary, party ledger, and GSTR-3B books ITC read the posted bill. GSTR-3B does not treat that tax as accepted ITC until a GSTR-2B review says `ACCEPTED`.

Missing or weak links:

- There is no supplier-payment allocation. Paying from an expense voucher does not settle the bill.
- Scanner confirmation depends on the configured OCR provider. `mock` is not a real extraction.
- Place of supply is required when the supplier state and the company state differ. Omitting it returns an error instead of guessing.

## Workflow 3 — Receipt and payment

1. On a sales invoice, the user records a receipt. `POST /api/v1/invoices/sales/:id/payments` rejects a draft, a cancelled invoice, a zero amount, and a settlement above the outstanding balance.
2. The receipt voucher debits cash or bank, debits discount allowed when a discount account exists, and credits the customer for the settled amount. A `payment_allocations` row stores the invoice id.
3. `paidAmount` and `balanceAmount` move by the settled total. The same idempotency reference returns the existing voucher instead of posting twice.
4. A general receipt voucher in `vouchers.service.ts` also requires at least one sales-invoice allocation and applies the same over-allocation check.
5. An expense voucher debits an expense ledger and credits cash or bank. It has no bill allocation.

Missing or weak links:

- Supplier bills cannot be allocated. `PaymentAllocation.salesInvoice` is the only document relation.
- `RecordPurchasePaymentDto` has no service method and no route.
- If the discount-allowed ledger is missing, the receipt fails the balance check rather than posting a one-sided entry. That is safe, and the user still needs that ledger in the chart.
- Outstanding and the party ledger are not the same number when unallocated journals or return credits exist. Outstanding now includes a non-zero invoice balance, including a credit. Aging still ignores credits.

## Workflow 4 — Returns

1. Sales return: `/sales/returns` calls `POST /api/v1/invoices/sales/:id/returns`. Purchase return: `/purchases/returns` calls `POST /api/v1/purchases/:id/returns`.
2. The service locks the source document and rejects a quantity above the quantity not yet returned.
3. A sales return restores stock when requested and posts a credit-note voucher that reverses output tax and the customer balance. A purchase return issues stock and posts a debit-note voucher that reverses the original input tax, including UTGST, by the returned quantity.
4. The original invoice or bill is kept. The return is a new document with its own number.
5. The source `balanceAmount` is reduced by the return total. Before this pass, `Decimal.max(0, …)` discarded any excess. A fully paid invoice therefore stayed at zero while the ledger recorded the credit. Both sales and purchase returns now store the signed remainder. A negative balance means the party is owed that credit.

Missing or weak links:

- The negative balance is not a refund voucher. Cash is not paid back automatically.
- Aging does not show the credit.
- Outward debit notes from `POST /gst/debit-notes` do not move stock and are not on the sales-return screen.
- Service-advance adjustments still do not post vouchers. That is intentional until a chartered accountant confirms the entry.

## Workflow 5 — GST

1. Posted sales, credit notes, debit notes, advances, and purchases are read by `GET /reports/gstr-1` and `GET /reports/gstr-3b` for the selected dates.
2. The GST screens under `/gst` display those payloads. Download stores a local JSON file. `filingStatus` remains `NOT_FILED`.
3. GSTR-2B import parses the file, stores a company-level hash, and matches supplier GSTIN, document number, date, and amounts. A second upload of the same file does not insert another import.
4. A user may accept only a matched or partial row, with a reason. Missing, duplicate, and mismatch rows cannot be accepted. Acceptance writes an adjustment row and does not post a voucher.
5. GSTR-3B table 6 uses accepted ITC only. Books ITC, pending review, and excluded ITC stay visible and are not treated as claimed.
6. E-invoice and e-way actions call the NIC client only when credentials resolve. Sandbox HTTP stays off unless `GST_SANDBOX_LIVE=true`. Production hosts are refused. UTGST e-way generation is blocked.

Missing or weak links:

- No GSTR is filed with the portal, and no filing acknowledgement is stored.
- IRP authentication is not the official public-key envelope.
- E-way requests are not encrypted with the session key.
- Generating a draft or a heartbeat does not create an IRN.

## What this pass tested

`sales-returns.integration.spec.ts` (9), `purchase-returns.integration.spec.ts` (12), and `reports.integration.spec.ts` (16) passed. The new sales-return test posts a cash invoice and a full return and expects the invoice balance to equal the negative credit-note total.
