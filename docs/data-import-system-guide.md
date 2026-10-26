# MyBill History — Project-Wide Excel/CSV Data Import System Guide

## Overview

The **MyBill History Data Import System** is a reusable, dynamic, multi-tenant enterprise import engine designed to enable seamless migration from legacy billing and ERP platforms (such as Tally ERP / Prime, Busy, Marg ERP, Vyapar, and customized Excel spreadsheets) directly into MyBill History without manual data re-entry.

---

## 1. Supported Modules

The system provides complete schema registration, synonym auto-mapping, validation, duplicate handling, and execution across:

| Module Identifier | Display Name (English / Gujarati) | Key Identifiers / Uniqueness | Target Operations |
|---|---|---|---|
| `parties` | Parties (Customers, Suppliers, Both) / વેપારીઓ | Phone, GSTIN | Auto-links Sundry Debtors/Creditors ledger, validates GSTIN |
| `items` | Products & Goods / વસ્તુઓ અને ઉત્પાદનો | SKU, Barcode, Name | Creates default warehouse stock, links primary UOM |
| `services` | Services & Labour / સેવાઓ | Service Name, SAC Code | Flags as `type: "SERVICE"` without inventory tracking |
| `item_categories` | Categories / કેટેગરીઝ | Category Name | Groups catalog items |
| `units_of_measure` | Units of Measure (UOM) / માપના એકમો | Unit Code (e.g. `NOS`, `KGS`) | Standardized UQC codes |
| `warehouses` | Warehouses & Godowns / ગોડાઉન અને વેરહાઉસ | Warehouse Name | Storage locations for inventory tracking |
| `item_batches` | Item Batches / બેચ અને એક્સપાયરી | Batch Number + Item | Track batch numbers, manufacturing & expiry dates |
| `hsn_masters` | HSN / SAC Directory / એચએસએન કોડ્સ | HSN/SAC Code | GST tax rates and descriptions |
| `opening_stock` | Opening Inventory / શરૂઆતનો સ્ટોક | Item Code + Warehouse | Posts `StockTransactionType.OPENING` ledger movement |
| `sales_invoices` | Historical Sales Invoices / વેચાણ બિલ | Invoice Number | Multi-item row grouping, party matching, ledger posting |
| `purchase_invoices`| Historical Purchase Bills / ખરીદ બિલ | Vendor Bill Number + Supplier | Multi-item row grouping, ITC eligibility, purchase register |
| `delivery_challans`| Delivery Challans / ડિલિવરી ચલણ | Challan Number | Goods movement without financial invoice posting |
| `ledger_groups` | Account Groups / ખાતાવહી જૂથો | Group Name | Chart of Accounts hierarchy |
| `ledger_accounts` | Ledgers & Opening Balances / ખાતાઓ | Account Name | Sundry ledgers, opening balance debit/credit entries |
| `bill_of_materials`| Bill of Materials (BOM) / ઉત્પાદન ફોર્મ્યુલા | Finished Good Item Code | Raw materials composition and yield ratios |

---

## 2. Architecture & Backend Pipeline

The backend import pipeline resides in `apps/api/src/imports/` and consists of modular services:

```
[Uploaded .xlsx / .csv Buffer]
             │
             ▼
   [FileParserService]
    - Secure SheetJS Parsing
    - Formula Injection Neutralization (=, +, -, @)
    - Unicode / Gujarati Encoding Support
    - Date & Number Normalization
             │
             ▼
 [ImportSchemaRegistry]
    - Exact & Synonym Column Matching
    - Multilingual Header Mapping (English & Gujarati)
             │
             ▼
 [ImportValidatorService]
    - Mandatory Field Enforcement
    - Indian GSTIN Luhn Modulo 36 Verification
    - Internal File Duplicate Detection
    - Database Conflict Identification (Existing Records)
             │
             ▼
[ImportExecutorService]
    - Multi-Tenant RLS Scoping (`executeInTenantContext`)
    - Conflict Modes (CREATE_ONLY, SKIP_DUPLICATES, UPDATE_EXISTING)
    - Financial & Inventory Integrity (Opening stock movements, ledger linking)
             │
             ▼
 [ErrorReportService]
    - Downloadable Failed-Rows Spreadsheet (.xlsx & .csv)
    - Exact Row Numbers & Gujarati Error Reasons
```

---

## 3. Security & Multi-Tenant Isolation

1. **Authentication & Company Context**: Every import endpoint enforces `@UseGuards(JwtAuthGuard, CompanyAccessGuard)`. The company context is derived strictly from the authenticated tenant session (`req.user.companyId`) and never from client payloads or spreadsheet columns.
2. **PostgreSQL RLS & Transaction Boundaries**: All writes execute inside `executeInTenantContext`, ensuring `SET LOCAL app.current_company_id` is applied for all queries.
3. **Spreadsheet Formula Injection Protection**: Cells beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` are sanitized by prepending a single quote `'` before parsing or logging, preventing formula execution exploits in Excel.
4. **Row & File Limits**: Upload buffers are capped (10MB default) and workbooks are limited to 10,000 rows per batch to guarantee predictable server memory and CPU utilization.
5. **No Intermediate Writes During Preview**: The preview endpoint evaluates in-memory rows against existing records without committing any database modifications.

---

## 4. REST API Reference

All routes are mounted under `/api/v1/imports`:

- `GET /api/v1/imports/modules`: Returns all registered modules with display labels, categories, and icons.
- `GET /api/v1/imports/:module/schema`: Fetches full column schema, mandatory flags, data types, and supported synonyms.
- `GET /api/v1/imports/:module/template?format=xlsx|csv`: Downloads ready-to-use template with headers and sample records.
- `POST /api/v1/imports/parse`: Parses uploaded file or base64 buffer, returns sheet names, headers, and detected mappings.
- `POST /api/v1/imports/validate`: Validates rows against tenant database, identifies duplicate/conflicting records.
- `POST /api/v1/imports/execute`: Commits rows transactionally, updates audit log, returns job execution summary.
- `GET /api/v1/imports/jobs`: Fetches import audit history for current company.
- `GET /api/v1/imports/jobs/:jobId`: Returns detailed status of specific import job.
- `GET /api/v1/imports/jobs/:jobId/errors?format=xlsx|csv`: Generates and streams failed rows error report.

---

## 5. User Workflow & Experience

### A. Dedicated Import Center
- Available at `/app/data-import` and `/data-import`.
- Categorized view (`All`, `Masters`, `Inventory`, `Sales`, `Purchases`, `Accounting`).
- Direct "Download Template" actions.
- Full audit history of past import jobs with status badges, record counts, and error downloads.

### B. In-Context Listing Page Imports
- Directly accessible via **"Import Excel / CSV"** buttons on:
  - Parties (`/masters/parties`)
  - Items & Products (`/masters/items`)
  - Categories (`/masters/categories`)
  - Units (`/masters/units`)
  - Sales Invoices (`/sales/invoices`)
  - Purchase Bills (`/purchases`)
- Opens the 5-step interactive **Import Wizard Modal**:
  1. **Upload**: Drag-and-drop `.xlsx` or `.csv` file.
  2. **Worksheet**: Select target worksheet (for multi-sheet Excel files).
  3. **Mapping**: Review and adjust auto-matched column mappings.
  4. **Configure & Preview**: Choose conflict strategy (`Skip Duplicates`, `Update Existing`, or `Create Only`) and review validated rows.
  5. **Execution & Report**: Execute transactional import with live server progress, success counter, and error download if any rows failed.
