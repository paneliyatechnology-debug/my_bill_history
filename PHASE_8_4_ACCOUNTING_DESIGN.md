# Phase 8.4 Accounting Design & Statutory Governance Specification

**Project:** Indian Billing & Accounting SaaS (`/home/dell/Jaydeep/Billing`)  
**Phase:** 8.4 — Inventory Accounting, Manufacturing Cost Allocation, General Ledger Reconciliation  
**Date:** 2026-10-13  
**Status:** DESIGN & APPROVAL GATE SPECIFICATION  

---

## 1. Audit of Existing Accounting vs. Inventory Architecture

An inspection of the existing codebase reveals a clear, consistent separation of concerns between financial accounting (General Ledger) and physical inventory (Stock Subledger):

### Current General Ledger (GL) Postings
- **Sales Invoices:** Automatically post double-entry vouchers (`VoucherType.SALES`):
  - Debit: `Sundry Debtors` / Customer Ledger (or `Cash Account` for cash sales)
  - Credit: `General Sales Account` (Direct Income)
  - Credit: `Output CGST` & `Output SGST` (or `Output IGST`)
  - Credit / Debit: `Round Off Account`
- **Purchase Invoices:** Automatically post double-entry vouchers (`VoucherType.PURCHASE`):
  - Debit: `General Purchases Account` (Direct Expenses)
  - Debit: `Input CGST (ITC)` & `Input SGST (ITC)` (or `Input IGST`)
  - Credit: `Sundry Creditors` / Supplier Ledger (or `Cash Account`)
- **Sales Returns:** Post `VoucherType.CREDIT_NOTE` reversing sales and tax liability.
- **Purchase Returns:** Post `VoucherType.DEBIT_NOTE` reversing purchases and ITC.
- **Payments & Receipts:** Post `VoucherType.PAYMENT` and `VoucherType.RECEIPT`.

### Current Inventory & Manufacturing Postings (Physical Subledger)
- **Production Start:** Appends `MANUFACTURING_CONSUMPTION` (negative quantity) to `stock_transactions`.
- **Production Completion:** Appends `MANUFACTURING_YIELD` (positive quantity with dynamically computed unit cost) to `stock_transactions`.
- **Stock Transfer Dispatch:** Appends `STOCK_TRANSFER_OUT` (negative quantity) to `stock_transactions`.
- **Stock Transfer Receipt:** Appends `STOCK_TRANSFER_IN` (positive quantity) to `stock_transactions` for accepted usable goods.
- **Delivery Challan Issue:** Appends `SALES_DISPATCH` (negative quantity) to `stock_transactions`.
- **Cancellations:** Append compensating positive records (`STOCK_ADJUSTMENT_PLUS`) under reference types `PRODUCTION_ORDER_CANCELLATION`, `STOCK_TRANSFER_CANCELLATION`, `DELIVERY_CHALLAN_CANCELLATION`.

### Architectural Invariant
In compliance with standard Indian SME practice (Tally / Vyapar periodic accounting convention), **physical stock ledger movements do NOT create automated general ledger vouchers by default**. The General Ledger operates on the **Periodic Inventory System**, where purchases are expensed upon acquisition and inventory is tracked in the physical stock ledger. Period-end financial statements (Trading Account, P&L, and Balance Sheet) reconcile through opening stock and closing stock valuations derived from the stock ledger.

---

## 2. Event-to-Ledger Mapping Matrix

| Business Event | Stock Subledger Effect | Existing GL Voucher | Perpetual Inventory GL Entry (When Enabled) |
| :--- | :--- | :--- | :--- |
| **Raw Material Consumption** | Appends `MANUFACTURING_CONSUMPTION` (-Qty) | None | **Dr.** Work-in-Progress (WIP)<br>**Cr.** Raw Materials Inventory |
| **Finished Goods Yield** | Appends `MANUFACTURING_YIELD` (+Qty @ UnitCost) | None | **Dr.** Finished Goods Inventory<br>**Cr.** Work-in-Progress (WIP)<br>**Cr.** Labor/Overhead Absorption |
| **Internal Transfer (Same GSTIN)** | Appends `STOCK_TRANSFER_OUT` & `STOCK_TRANSFER_IN` | None | None (Internal location movement within same entity) |
| **Inter-State Branch Transfer** | Blocked unless Branch Transfer Invoice created | None (Requires Tax Invoice) | **Dr.** Receiving Branch Account<br>**Cr.** Branch Sales / Stock Transfer<br>**Cr.** Output IGST |
| **Transit Shortage / Damage** | Tracked as line variance; not added to destination stock | None | **Dr.** Transit Loss (Abnormal Expense)<br>**Cr.** Purchases / Goods in Transit |
| **Job Work Challan (Rule 55)** | Appends `SALES_DISPATCH` (-Qty) | None | None (Ownership retained by principal; no financial sale) |
| **Order / Transfer Cancellation** | Appends compensating `STOCK_ADJUSTMENT_PLUS` | None | Reversal of corresponding perpetual journal entry |

---

## 3. Detailed Proposed Accounting Entries (Subject to CA Approval)

### 3.1. Manufacturing & Production Lifecycle (Perpetual Model)

#### A. Raw Material Consumption (`startProduction`)
$$\text{Dr. Work-in-Progress (WIP) Account} \quad [\text{Asset / Inventory}]$$
$$\text{Cr. Raw Materials Stock Account (or General Purchases)} \quad [\text{Asset / Direct Expense}]$$
- *Valuation:* Exact weighted-average / FIFO purchase cost of consumed raw components.

#### B. Finished Goods Completion (`completeProduction`)
$$\text{Dr. Finished Goods Inventory Account} \quad [\text{Asset / Inventory}]$$
$$\text{Cr. Work-in-Progress (WIP) Account} \quad [\text{Cost of Raw Materials Converted}]$$
$$\text{Cr. Direct Labor Absorption Account} \quad [\text{Actual Labor Cost}]$$
$$\text{Cr. Factory Overhead Absorption Account} \quad [\text{Actual Overhead Cost}]$$
- *Valuation:*
  $$\text{Unit Cost} = \frac{\text{Raw Material Cost} + \text{Actual Labor} + \text{Actual Overhead} - \text{Scrap Realization}}{\text{Actual Produced Quantity}}$$

#### C. Production Order Cancellation (Before Completion)
$$\text{Dr. Raw Materials Stock Account} \quad [\text{Restored Raw Cost}]$$
$$\text{Cr. Work-in-Progress (WIP) Account} \quad [\text{Restored Raw Cost}]$$
- Uses an append-only reversal journal voucher linked to `sourceDocument: "PRODUCTION_ORDER_CANCELLATION"`.

---

### 3.2. Stock Transfers & In-Transit Variance

#### A. Intra-State Warehouse Transfer (Same GSTIN)
- **Accounting Policy:** No financial entry. Physical stock transfer is recorded exclusively in the stock ledger. Valuation basis follows the goods to the destination warehouse.

#### B. Goods in Transit Accounting (Multi-Day Transit under Perpetual System)
- Upon Dispatch:
  $$\text{Dr. Goods in Transit Account} \quad [\text{Current Asset}]$$
  $$\text{Cr. Warehouse A Inventory Account} \quad [\text{Current Asset}]$$
- Upon Receipt:
  $$\text{Dr. Warehouse B Inventory Account} \quad [\text{Accepted Qty} \times \text{Unit Cost}]$$
  $$\text{Dr. Transit Loss / Damage Expense Account} \quad [\text{Lost/Damaged Qty} \times \text{Unit Cost}]$$
  $$\text{Cr. Goods in Transit Account} \quad [\text{Total Dispatched Valuation}]$$

#### C. Inter-State Branch Transfers (Distinct Persons under Section 25(4) CGST Act)
- Under Indian GST law, transfers between distinct registrations require a Branch Transfer Tax Invoice.
  $$\text{Dr. Branch Clearing / Inter-Branch Account} \quad [\text{Total Invoice Amount}]$$
  $$\text{Cr. Branch Transfer Outward (Revenue / Direct Income)} \quad [\text{Taxable Value}]$$
  $$\text{Cr. Output IGST Payable} \quad [\text{Integrated Tax}]$$

---

### 3.3. Transit Shortage, Damage & Section 17(5)(h) ITC Reversal

#### A. Normal vs. Abnormal Loss
1. **Normal Transit Shrinkage (e.g., evaporation, standard weight loss):**
   - Absorbed into the unit cost of remaining accepted units.
   - No separate loss journal entry is booked.
2. **Abnormal Transit Damage (e.g., accident, spillage, theft):**
   - Debited to `Transit Loss Account` (Indirect Expense).

#### B. Section 17(5)(h) ITC Reversal
- Under Section 17(5)(h) of the CGST Act, Input Tax Credit cannot be availed on goods lost, stolen, destroyed, written off, or disposed of by way of gift or free samples.
- Proposed entry:
  $$\text{Dr. Transit Loss (or ITC Ineligible Loss) Account} \quad [\text{GST Credit Reversal}]$$
  $$\text{Cr. Input CGST (ITC) Reversal Account} \quad [\text{Central Tax}]$$
  $$\text{Cr. Input SGST (ITC) Reversal Account} \quad [\text{State Tax}]$$
- *Status:* **Awaiting CA Confirmation** before enabling automated tax reversal vouchers.

---

## 4. Statutory Decisions Requiring Chartered Accountant (CA) Sign-off

| # | Statutory Decision Area | Regulatory Reference | Open Question for CA Review | Antigravity Safe Default |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Inventory Accounting Model** | AS-2 / Ind AS-2 | Should the SaaS enforce **Periodic Inventory** (stock valuation reconciled at period end) or **Perpetual Inventory** (automatic journals for every consumption/yield)? | Default to **Periodic Inventory**; provide manual / configurable posting. |
| **2** | **Inter-State Transfer Valuation** | Rule 28 CGST Rules | When issuing a Branch Transfer Invoice between distinct GST registrations, should the taxable value default to Cost + 10%, Open Market Value, or Invoice Value (where recipient is eligible for full ITC)? | Require user confirmation; do not hardcode a single valuation formula. |
| **3** | **ITC Reversal Trigger** | Section 17(5)(h) CGST Act | Should transit damages logged during stock receipt automatically post an ITC reversal voucher, or should ITC reversal be reviewed and booked at month-end GSTR-3B filing? | Keep as a reported variance for CA review; do not post automatic tax debit. |
| **4** | **Job Work Aging & Deemed Supply** | Section 143 CGST Act | If goods sent under Rule 55 Delivery Challan do not return within 1 year (inputs) or 3 years (capital goods), they are deemed supplies from original dispatch date. How should retrospective interest and tax be computed? | Report aging in Job Work register; do not automatically fabricate tax invoices. |

---

## 5. Stock Valuation vs. General Ledger Reconciliation Engine

Phase 8.4 will implement a formal **Stock Valuation vs. General Ledger Reconciliation Report** accessible via API and reports dashboard:

### Reconciliation Formula
$$\text{Theoretical Closing Stock} = \text{Opening Stock Valuation} + \text{Total Purchases (General Purchases GL)} + \text{Manufacturing Cost Added} - \text{Cost of Goods Sold (COGS)}$$
$$\text{Physical Stock Valuation} = \sum_{\text{items}} (\text{On-Hand Quantity} \times \text{Valuation Rate})$$
$$\text{Reconciliation Variance} = \text{Theoretical Closing Stock} - \text{Physical Stock Valuation}$$

### Report Elements
1. **Physical Inventory Subledger Balance:** Aggregated valuation from `stock_transactions` as of query date.
2. **General Ledger Purchase / Inventory Balances:** Aggregated debits and credits from `General Purchases Account`, `Purchase Returns`, and inventory nominal accounts.
3. **In-Transit Unaccepted Valuation:** Valuation of goods in `DISPATCHED` stock transfers not yet received.
4. **Transit Loss & Shortage Valuation:** Total value of shortages and damages recorded during the period.
5. **Variance Reconciliation Audit:** Line-by-line reconciliation identifying unposted variances or timing differences.

---

## 6. Implementation Scope for Phase 8.4

### In-Scope:
1. **Reconciliation Service & Controller (`InventoryReconciliationService`):**
   - Endpoints to reconcile physical stock valuation with General Ledger balances.
   - In-transit valuation report.
   - Transit loss and variance summary report.
   - Manufacturing cost reconciliation (Materials Consumed + Labor + Overhead vs Finished Goods Produced).
2. **Optional Perpetual Journal Generator (`PerpetualInventoryService`):**
   - Configurable setting on `Company` (`enablePerpetualInventory: boolean`).
   - If enabled and required accounts exist, posts balanced `JOURNAL` vouchers for manufacturing completion and transit write-offs.
   - If disabled (default), stock movements remain strictly in the append-only stock ledger with zero synthetic GL entries.
3. **Append-Only Idempotent Reversals:**
   - Any reversal posts a compensating `JOURNAL` voucher with `isCancelled: true` linkage.
4. **Comprehensive Integration Tests:**
   - Tests validating balanced debits and credits, zero floating-point drift, period locks, idempotency, and RLS isolation.

### Out-of-Scope (Deferred to CA Sign-Off):
- Automated Section 17(5)(h) tax debit notes.
- Automatic creation of fake GSP/NIC E-Way bills or IRNs.
- Modifying previously applied migrations.
