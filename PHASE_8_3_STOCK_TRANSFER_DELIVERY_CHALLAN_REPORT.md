# Phase 8.3: Stock Transfers, In-Transit Inventory & Delivery Challans Report

**Project:** Indian Billing & Accounting SaaS (`/home/dell/Jaydeep/Billing`)  
**Phase:** 8.3 — Stock Transfers, In-Transit Inventory & Delivery Challans Backend Implementation  
**Status:** COMPLETED & VERIFIED  
**Date:** 2026-10-13  

---

## 1. Executive Summary

Phase 8.3 implements the complete backend architecture, state machines, two-phase inventory movements, transit variance tracking, Delivery Challans (Rule 55 CGST Rules), E-Way Bill validation (Rule 138 CGST Rules), and multi-tenant Row-Level Security (RLS) enforcement.

All implementations strictly reuse existing database tables (`stock_transfers`, `stock_transfer_items`, `delivery_challans`, `delivery_challan_items`, `stock_transactions`), with zero schema mutations, zero breaking changes to existing invoices or accounting records, and zero mocks used in verification.

---

## 2. Files Changed & Created

### DTOs & Validation Schemas (`apps/api/src/distribution/dto/`)
1. [`create-stock-transfer.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/create-stock-transfer.dto.ts): Strongly typed creation DTO validating source and destination warehouses, date, notes, items array with quantities and optional batch selection.
2. [`update-stock-transfer.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/update-stock-transfer.dto.ts): DTO for editing DRAFT transfers.
3. [`dispatch-stock-transfer.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/dispatch-stock-transfer.dto.ts): Schema for transitioning `DRAFT -> DISPATCHED` with challan and vehicle details.
4. [`receive-stock-transfer.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/receive-stock-transfer.dto.ts): Schema for transitioning `DISPATCHED -> RECEIVED` supporting explicit variance breakdown (`receivedQuantity`, `shortageQuantity`, `damageQuantity`, `remarks`).
5. [`cancel-stock-transfer.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/cancel-stock-transfer.dto.ts): Schema capturing mandatory cancellation reason.
6. [`create-delivery-challan.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/create-delivery-challan.dto.ts): Schema for Rule 55 Delivery Challan creation with party, warehouse, challan type (`JOB_WORK`, `SUPPLY_ON_APPROVAL`, `BRANCH_TRANSFER`, `OTHER`), and item tax lines.
7. [`issue-delivery-challan.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/issue-delivery-challan.dto.ts): Schema for issuing challan and dispatching goods.
8. [`cancel-delivery-challan.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/cancel-delivery-challan.dto.ts): Schema for cancelling challan with stock restock.
9. [`eway-bill-payload.dto.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/dto/eway-bill-payload.dto.ts): Schema for Rule 138 E-Way bill distance, transporter, vehicle attributes, and status response.

### Services & Controllers (`apps/api/src/distribution/`)
10. [`stock-transfers.service.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/stock-transfers.service.ts):
    - Concurrency-safe sequential numbering: `ST/YY-YY/XXXX` via advisory locking (`seq_${companyId}_stock_transfers`).
    - Two-phase inventory movement: Appends `STOCK_TRANSFER_OUT` (-Qty) at dispatch and `STOCK_TRANSFER_IN` (+Accepted Qty) at receipt.
    - Transit variance tracking: Automatically accounts for shortages and logs `STOCK_TRANSFER_TRANSIT_DAMAGE` via append-only `STOCK_ADJUSTMENT_MINUS`.
    - In-transit reconciliation endpoint: Reconciles dispatched, received, and outstanding inventory.
    - Safe restock on cancel: Reverses `DISPATCHED` movements back to source warehouse using `STOCK_TRANSFER_CANCELLATION` (`STOCK_ADJUSTMENT_PLUS`). Blocks cancellation once `RECEIVED`.
    - GST Statutory enforcement: Rejects non-taxable stock transfer between branches located in different states (distinct persons under Section 25 CGST Act).
11. [`stock-transfers.controller.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/stock-transfers.controller.ts): REST endpoints mounted at `/api/v1/distribution/transfers`.
12. [`delivery-challans.service.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/delivery-challans.service.ts):
    - Sequential numbering: `DC/YY-YY/XXXX`.
    - Statutory GST calculations: Dynamically computes CGST + SGST (intra-state) or IGST (inter-state) on challan lines.
    - Inventory dispatch: Deducts goods atomically via `SALES_DISPATCH` on `issueChallan`.
    - Full lifecycle management: `DRAFT -> ISSUED -> CLOSED / CANCELLED`.
    - Restocks goods on cancellation of `ISSUED` challan via `DELIVERY_CHALLAN_CANCELLATION`.
    - E-Way Bill Rule 138 compliance: Validates distance and payload parameters, returning `{ status: "NOT_CONFIGURED" }` when live third-party GSP credentials are not supplied.
13. [`delivery-challans.controller.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/delivery-challans.controller.ts): REST endpoints mounted at `/api/v1/distribution/challans`.
14. [`distribution.module.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/distribution/distribution.module.ts): NestJS module bundling distribution providers and controllers.

### Core Registration & Integration Tests
15. [`apps/api/src/app.module.ts`](file:///home/dell/Jaydeep/Billing/apps/api/src/app.module.ts): Registered `DistributionModule`.
16. [`apps/api/test/distribution.integration.spec.ts`](file:///home/dell/Jaydeep/Billing/apps/api/test/distribution.integration.spec.ts): 22 real-database integration tests covering the complete feature set.

---

## 3. API Endpoints & State Machine Matrix

### Stock Transfers Endpoints (`/api/v1/distribution/transfers`)
| Method | Endpoint | Action | State Transition |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Create Stock Transfer | `-> DRAFT` |
| `GET` | `/` | List all Stock Transfers | Read-only |
| `GET` | `/:id` | Get Transfer Details | Read-only |
| `GET` | `/:id/reconciliation`| In-transit quantity reconciliation | Read-only |
| `PUT` | `/:id` | Edit DRAFT Transfer | `DRAFT -> DRAFT` |
| `POST` | `/:id/dispatch` | Dispatch Goods | `DRAFT -> DISPATCHED` |
| `POST` | `/:id/receive` | Accept Goods & Variances | `DISPATCHED -> RECEIVED` |
| `POST` | `/:id/cancel` | Cancel Transfer | `DRAFT / DISPATCHED -> CANCELLED` |

### Delivery Challans Endpoints (`/api/v1/distribution/challans`)
| Method | Endpoint | Action | State Transition |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Create Delivery Challan | `-> DRAFT` |
| `GET` | `/` | List all Challans | Read-only |
| `GET` | `/:id` | Get Challan Details | Read-only |
| `POST` | `/:id/issue` | Issue Challan (Dispatch Goods) | `DRAFT -> ISSUED` |
| `POST` | `/:id/close` | Close Challan (Work Completed / Goods Returned) | `ISSUED -> CLOSED` |
| `POST` | `/:id/cancel` | Cancel Challan (Restore Stock) | `DRAFT / ISSUED -> CANCELLED` |
| `POST` | `/:id/eway-bill`| Validate & Generate E-Way Bill Rule 138 Payload | Prepares NIC Payload |

---

## 4. Two-Phase Inventory & Variance Mechanics

### A. Dispatch (`dispatchTransfer`)
- Lock key: `pg_advisory_xact_lock(hashtext('stock_transfer_' || id))`
- Stock check: If `company.allowNegativeStock === false`, asserts available stock $\ge$ transfer quantity under item lock.
- Ledger entry: Appends `StockTransaction`:
  - `transactionType: STOCK_TRANSFER_OUT`
  - `warehouseId: fromWarehouseId`
  - `quantity: -Quantity`
  - `referenceDocType: "STOCK_TRANSFER"`
- In-transit state: Items are in-transit between source and destination warehouses until receipt.

### B. Receipt (`receiveTransfer`)
- Lock key: `pg_advisory_xact_lock(hashtext('stock_transfer_' || id))`
- Variance assertion:
  $$\text{Received Qty} + \text{Shortage Qty} + \text{Damage Qty} \le \text{Dispatched Qty}$$
  Rejects with `BadRequestException` if this invariant is violated.
- Ledger entry for Accepted Goods:
  - `transactionType: STOCK_TRANSFER_IN`
  - `warehouseId: toWarehouseId`
  - `quantity: +Received Qty`
- Ledger entry for Damaged Goods:
  - `transactionType: STOCK_ADJUSTMENT_MINUS`
  - `warehouseId: toWarehouseId`
  - `quantity: -Damage Qty`
  - `referenceDocType: "STOCK_TRANSFER_TRANSIT_DAMAGE"`
- Idempotency: Retrying `receiveTransfer` on an already `RECEIVED` order returns the active record without inserting duplicate ledger rows.

### C. Cancellation (`cancelTransfer`)
- If `status === DRAFT`: Marked `CANCELLED` directly.
- If `status === DISPATCHED`: Reverses all outward stock entries by appending `STOCK_ADJUSTMENT_PLUS` (+Quantity) to source warehouse under `referenceDocType: "STOCK_TRANSFER_CANCELLATION"`.
- If `status === RECEIVED`: Cancellation is strictly blocked with `BadRequestException("Completed/received stock transfers cannot be cancelled.")`.

---

## 5. GST Statutory Analysis & Policy Decisions

### A. Same-GSTIN vs. Distinct-GSTIN Warehouse Transfers
1. **Intra-State Transfer (Same State, Same GSTIN):**
   - Treated as non-taxable internal warehouse transfer.
   - Non-taxable `StockTransfer` and internal Delivery Challan are permitted under Rule 55.
2. **Inter-State Branch Transfer (Different States):**
   - Under Section 25(4) and Section 25(5) of the CGST Act, establishments of the same business in different states are **distinct persons**.
   - Under Schedule I (Entry 2) of the CGST Act, transfer of goods between distinct persons without consideration constitutes a **taxable supply**.
   - Under Rule 46 of the CGST Rules, a **Tax Invoice** charging IGST is required, not a non-taxable stock transfer.
   - **Enforcement:** `StockTransfersService.dispatchTransfer` explicitly validates state codes of both warehouses. If source and destination branches are in different states, it throws:
     > *"Inter-state transfer from State X to State Y constitutes a supply between distinct persons under Section 25(4) CGST Act. Non-taxable warehouse transfer is disallowed; a Branch Transfer Tax Invoice with IGST is required under Rule 46."*

### B. Delivery Challan Compliance (Rule 55 CGST Rules)
- Supports permissible categories: `JOB_WORK` (Section 143), `SUPPLY_ON_APPROVAL`, `BRANCH_TRANSFER`, `OTHER`.
- Computes statutory GST amounts (CGST/SGST or IGST) based on destination Place of Supply without requiring full tax invoice classification.

### C. Unresolved Policy Items for CA Review
1. **Valuation of Inter-State Branch Transfers:** Under Rule 28 of CGST Rules, open market value applies; however, if the recipient branch is eligible for full Input Tax Credit (ITC), any value declared on the invoice is accepted as open market value. The business should confirm default margin markup policy.
2. **Transit Loss ITC Reversal:** Under Section 17(5)(h) of the CGST Act, ITC must be reversed on goods lost, stolen, destroyed, or written off in transit. When a transit shortage/damage is logged, whether the system should automatically generate an ITC reversal journal voucher is flagged for Phase 8.4.

---

## 6. E-Way Bill Rule 138 Integration Status

1. **Validation Engine:** Validates mandatory consignment parameters:
   - Mandatory if consignment value > ₹50,000 (Rule 138(1)).
   - Mandatory for inter-state job work movements regardless of consignment value.
   - Requires valid `distanceKm > 0`, vehicle number or transporter ID.
2. **NIC Standard Payload:** Prepares official JSON schema with `docType: "CHL"`, `subSupplyType: 4` (Job work) or `2` (Branch transfer), HSN codes, and GST rates.
3. **Environment Security Guard:** Does NOT fabricate false EWB numbers or IRNs. If `NIC_EWAY_BILL_CLIENT_ID` is absent in environment, returns:
   `status: "NOT_CONFIGURED"`, returning the validated payload for external upload or manual filing on the NIC portal.

---

## 7. Automated Test Results & Command Output

### 1. Dedicated Distribution Integration Suite
```
pnpm --filter @billing/api test test/distribution.integration.spec.ts

 ✓ test/distribution.integration.spec.ts (22) 922ms
   ✓ Phase 8.3: Stock Transfers, In-Transit Inventory & Delivery Challans Integration Test Suite (22) 921ms
     ✓ 1. Stock Transfer Lifecycle & In-Transit Tracking (12)
       ✓ should reject transfer when source and destination warehouse are identical
       ✓ should reject transfer with negative or zero quantities
       ✓ should create a valid DRAFT Stock Transfer with sequential number
       ✓ should allow updating DRAFT stock transfer items and notes
       ✓ should reject dispatch if source warehouse stock is insufficient under strict policy
       ✓ should dispatch transfer atomically: deducting source warehouse stock and setting in-transit status
       ✓ should prevent modifying a DISPATCHED stock transfer
       ✓ should be idempotent on dispatch: retried dispatch returns existing state without duplicate stock deduction
       ✓ should accurately report in-transit reconciliation before receipt
       ✓ should reject receipt if received + shortage + damage exceeds dispatched quantity
       ✓ should successfully receive transfer with variance: accepted stock + transit damage loss
       ✓ should prevent cancelling a completed/received stock transfer
     ✓ 2. Cancellation Restock & GST Branch Transfer Rules (2)
       ✓ should cancel a DISPATCHED stock transfer and restore source warehouse inventory
       ✓ should reject inter-state warehouse transfer as non-taxable stock transfer under Section 25 CGST Act
     ✓ 3. Delivery Challan Lifecycle & E-Way Bill Rule 138 (5)
       ✓ should create a DRAFT Delivery Challan with statutory GST calculations
       ✓ should issue delivery challan and atomically dispatch goods from warehouse
       ✓ should close an issued delivery challan when job work returns or completes
       ✓ should cancel an ISSUED delivery challan and restore stock
       ✓ should prepare valid Rule 138 E-Way Bill payload and return NOT_CONFIGURED when live NIC credentials absent
     ✓ 4. Multi-Tenant Security & Isolation (3)
       ✓ Tenant B cannot view Tenant A's Stock Transfers
       ✓ Tenant B cannot dispatch, receive, or cancel Tenant A's Stock Transfer
       ✓ Tenant B cannot view, issue, or cancel Tenant A's Delivery Challans

 Test Files  1 passed (1)
      Tests  22 passed (22)
   Duration  1.84s
```

### 2. Full Regression Suite (All Test Files)
```
pnpm --filter @billing/api test

 Test Files  19 passed (19)
      Tests  236 passed (236)
   Duration  44.09s
```
- **19 of 19 test files passed (100%)**
- **236 of 236 tests passed (0 failed, 0 skipped)**
- Zero regressions in existing modules (BOM, Production Orders, Sales Invoices, Purchases, Accounting, Reports, Masters, Tenant RLS, Health Probes).

### 3. Workspace Type-Check
```
pnpm -r type-check

packages/shared-types: Done in 560ms (0 errors)
packages/database: Done in 1.4s (0 errors)
apps/web: Done in 2s (0 errors)
packages/accounting-core: Done in 1.2s (0 errors)
apps/api: Done in 2.2s (0 errors)
```

---

## 8. Known Limitations & Recommended Next Steps

1. **Phase 8.4 (Accounting Vouchers & Reconciliation):** Implement automated journal voucher posting for in-transit inventory, WIP absorption variances, and Section 17(5)(h) ITC reversals upon completion of policy review.
2. **Phase 8.5 (Frontend UI):** Build user-friendly UI screens for Stock Transfers (with dispatch/receive workflow) and Delivery Challan designer.
