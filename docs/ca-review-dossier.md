# Chartered Accountant (CA) Review Dossier

**Indian Billing & Accounting SaaS (Phases 1–6)**
_Document Version: 1.0 | Date: October 2026_
_Target Standard: ICAI Accounting Standards, Companies Act 2013 (Rule 3(1) Audit Trail), and CGST/SGST Act 2017_

---

## 1. Executive Summary & Statutory Framework

This document presents the formal technical and accounting architecture implemented across Phases 1 through 6 for review, validation, and statutory sign-off by practicing Chartered Accountants (CAs).

### 1.1 Applicable Statutory Frameworks

- **ICAI Accounting Standards (AS)**:
  - **AS-2 (Revised) / Ind AS 2**: Valuation of Inventories (Periodic inventory model, FIFO / Weighted Average).
  - **AS-9**: Revenue Recognition (Point of supply / delivery of invoice).
  - **AS-10 / Ind AS 16**: Accounting for Plant, Property & Equipment.
  - **Schedule III to Companies Act, 2013**: Presentation of Balance Sheet and Statement of Profit and Loss.
- **Goods and Services Tax (GST)**:
  - **CGST / SGST Act 2017, Sections 9, 12, 13, 15, 31, 34, 170**: Tax invoices, time and value of supply, credit/debit notes, and statutory round-off.
  - **GSTR-1 & GSTR-3B Rules**: HSN summary, B2B/B2C classification, and monthly outward supply returns.
- **Ministry of Corporate Affairs (MCA)**:
  - **Rule 3(1) of Companies (Accounts) Rules, 2014**: Mandatory tamper-evident audit trail (edit log) for each transaction with date, user ID, and hash chaining.

---

## 2. Inventory Accounting Methodology & COGS

### 2.1 Periodic Inventory vs. Perpetual Inventory Model

The system is intentionally architected for **Periodic Inventory (AS-2 / Ind AS 2)** for SME, retail, and wholesale traders:

```
[ Sales Invoice Issued ]
        │
        ├─► Debit: Sundry Debtors (Party) or Cash/Bank
        ├─► Credit: Sales Revenue (Account 4000)
        ├─► Credit: CGST Output Liability (Account 2110)
        ├─► Credit: SGST Output Liability (Account 2120)
        └─► Credit/Debit: Round Off (Account 4990)
```

> [!NOTE]
> **No per-invoice COGS posting:** In accordance with standard Indian retail/wholesale SME accounting practice, daily billing does **not** post perpetual debit entries to Cost of Goods Sold (`COGS`) or credits to the ledger `Inventory Asset` account at the moment of invoice issuance.
>
> Physical inventory movements are recorded in an append-only stock ledger (`stock_transactions`) tracking quantities, batches, and unit costs.

### 2.2 Periodic Cost of Goods Sold (COGS) Calculation

For financial reporting (Profit & Loss and Balance Sheet), COGS is derived using the standard statutory formula:

$$\text{COGS} = \text{Opening Stock} + \text{Net Purchases} + \text{Direct Expenses} - \text{Closing Stock}$$

Where:

- **Opening Stock**: Carried forward from previous financial year closing balance.
- **Net Purchases**: Total debits to Purchase accounts (Account `5000`) minus purchase returns/discounts.
- **Direct Expenses**: Freight inwards, manufacturing/handling wages, carriage inward (Account `5100-5199`).
- **Closing Stock**: Valued from physical stock balances using the chosen inventory valuation method:
  1. **FIFO (First In First Out)**: Oldest inventory cost applied to closing balance.
  2. **Weighted Average**: Average acquisition cost across active batches.
  3. **Batch Actual**: Exact batch procurement cost.

---

## 3. Financial Statements & Reporting Engine

### 3.1 Trial Balance

- **Invariant**: Strict Double-Entry equality.
  $$\sum \text{Debit Balances} - \sum \text{Credit Balances} \equiv 0.00$$
- Accounts are grouped according to 5 statutory parent categories:
  1. `ASSET` (Debits positive)
  2. `LIABILITY` (Credits positive)
  3. `EQUITY` (Credits positive)
  4. `INCOME` (Credits positive)
  5. `EXPENSE` (Debits positive)
- All vouchers enforce $\sum \text{Debit} = \sum \text{Credit}$ at the database transaction level before insertion.

### 3.2 Profit & Loss Account (Trading & P&L)

The report is rendered in two structured sections:

1. **Trading Account**:
   - Gross Revenue (Domestic Sales, Inter-State Sales, Export).
   - Less: Returns & Deductions.
   - Less: Periodic COGS (Opening Stock + Purchases + Direct Expenses - Closing Stock).
   - **Result**: $\text{Gross Profit / Loss}$.
2. **Profit & Loss Account**:
   - Gross Profit transferred.
   - Add: Other Incomes (Interest, Discounts Received).
   - Less: Indirect Expenses (Rent, Salaries, Utilities, Depreciation).
   - **Result**: $\text{Net Profit / Loss Before Tax}$.

### 3.3 Balance Sheet (Schedule III Format)

- **Equities & Liabilities**:
  - Shareholders' Funds / Capital Accounts.
  - Reserves & Surplus (Current Year Retained P&L transferred dynamically).
  - Non-Current Liabilities (Long-term borrowings).
  - Current Liabilities (Sundry Creditors, Duties & Taxes / GST Output Payable, Provisions).
- **Assets**:
  - Non-Current Assets (Fixed Assets, Plant & Machinery).
  - Current Assets (Closing Inventory, Sundry Debtors, Cash & Bank Balances).
- **Validation**: Total Equities & Liabilities must match Total Assets.

---

## 4. GST Compliance & Returns (CGST / SGST Act 2017)

### 4.1 Statutory Rounding (Section 170 of CGST Act)

Under Section 170:

> "The amount of tax, interest, penalty, fine or any other sum payable, and the amount of refund or any other sum due, under the provisions of this Act shall be rounded off to the nearest rupee and, for this purpose, where such amount contains a part of a rupee consisting of paise, then, if such part is fifty paise or more, it shall be increased to one rupee and if such part is less than fifty paise it shall be ignored."

**Implementation:**

- Tax calculations on line items compute exact decimal values to 2 decimal places.
- Summed taxes across CGST, SGST, and IGST are rounded to the nearest integer rupee if total bill rounding is enabled.
- The difference between the unrounded total and the rounded final payable amount is posted to Account `4990` (`Round Off Account`).

### 4.2 Tax Determination Matrix

| Scenario             | Supplier State | Customer State      | Applicable Taxes            | Ledger Postings                                |
| :------------------- | :------------- | :------------------ | :-------------------------- | :--------------------------------------------- |
| **Intra-State B2B**  | 24 (Gujarat)   | 24 (Gujarat)        | CGST (9%) + SGST (9%)       | Cr: 2110 (CGST Output), Cr: 2120 (SGST Output) |
| **Inter-State B2B**  | 24 (Gujarat)   | 27 (Maharashtra)    | IGST (18%)                  | Cr: 2130 (IGST Output)                         |
| **B2C Retail (POS)** | 24 (Gujarat)   | Unregistered / None | CGST + SGST (State rate)    | Cr: 2110 (CGST Output), Cr: 2120 (SGST Output) |
| **SEZ Supply**       | 24 (Gujarat)   | SEZ Unit (24)       | Zero-rated IGST or with LUT | Cr: 2130 or Nil with LUT declaration           |

### 4.3 GSTR-1 Mapping Table

- **Table 4 (B2B)**: Registered recipients with valid 15-character GSTIN. Includes invoice number, date, value, tax rate, and place of supply (POS).
- **Table 5 (B2C Large)**: Unregistered recipients with invoice value $> ₹2,50,000$ and inter-state supply.
- **Table 7 (B2C Small)**: Intra-state unregistered retail sales + inter-state invoices $\le ₹2,50,000$, aggregated by POS and tax rate.
- **Table 9 (Credit/Debit Notes)**: Registered credit and debit notes citing original invoice numbers.
- **Table 12 (HSN Summary)**: Mandatory 4, 6, or 8 digit HSN/SAC summary showing quantity, taxable value, and tax breakdown.
- **Table 13 (Document Series)**: Total count of issued, cancelled, and net invoices per financial year sequence.

---

## 5. Credit Notes, Invoices Cancellation & Reversals

### 5.1 Immutable Legal Invoice Numbers

- Invoices are issued with strictly gapless sequential numbers per company and financial year (e.g., `INV/2026-27/0001`).
- When an issued invoice is cancelled:
  1. The record is flagged as `status = 'CANCELLED'`.
  2. The invoice number is **never deleted or reused**.
  3. The legal sequence is preserved.

### 5.2 Accounting Reversals

- When an issued invoice is cancelled, the system creates a compensating reversal journal entry:
  - **Debit**: Sales Revenue (Account `4000`)
  - **Debit**: CGST Output Tax (Account `2110`)
  - **Debit**: SGST Output Tax (Account `2120`)
  - **Credit**: Sundry Debtors (Party Account)
- Stock quantities previously deducted are restored in `stock_transactions` via an audited `INWARD_RETURN` movement.

---

## 6. MCA Audit Trail (Rule 3(1) Compliance)

### 6.1 Requirements

Every company using accounting software must maintain an audit trail of each and every transaction, creating an edit log of each change made in books of account along with:

1. Date and time of modification.
2. User ID and IP address of the editor.
3. Inability to disable the audit trail feature.

### 6.2 Technical Implementation

- Table: `audit_logs`
- Immutability: Application code and database triggers enforce append-only permissions on `audit_logs`. No `UPDATE` or `DELETE` statements are allowed.
- Cryptographic verification: Each audit log entry calculates:
  $$\text{currentHash} = \text{SHA-256}(\text{previousHash} + \text{timestamp} + \text{entityId} + \text{action} + \text{payload})$$
  Any manual manipulation of database records breaks the verification chain and alerts auditors.

---

## 7. Sign-off & Verification Questions for Auditor

Please inspect the following points during the audit:

1. **Periodic vs. Perpetual Inventory**: Confirm acceptance of periodic inventory valuation for SME retail/wholesale rollout.
2. **Section 170 Rounding**: Confirm the `Round Off` ledger account treatment for fractional paise variances.
3. **Credit Notes vs. Cancellation**: Confirm compliance of the cancellation contra-voucher workflow for invoices cancelled within the statutory tax period.
4. **Schedule III Presentation**: Review the Balance Sheet grouping of reserves and current liabilities.

**Auditor Sign-Off:**

| Name of Auditor      | Membership No.       | Firm Name            | Signature            | Date                 |
| :------------------- | :------------------- | :------------------- | :------------------- | :------------------- |
| ____________________ | ____________________ | ____________________ | ____________________ | ____________________ |
