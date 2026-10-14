# 01 — Project Structure & Workspace Configuration

> **Audit Date:** October 14, 2026  
> **Repository Root:** `C:\Billing\my_bill_history`  
> **Workspace Standard:** `pnpm` workspaces (v9.15.0)

---

## 1. Monorepo Organization & Workspace Topography

The project is structured as a multi-package monorepo governed by `pnpm-workspace.yaml`. The top-level directory houses applications under `apps/` and domain packages under `packages/`.

```
my_bill_history/
├── apps/
│   ├── api/                    # NestJS 10 Fastify backend microservice / REST API
│   └── web/                    # Next.js 14 App Router frontend application
├── packages/
│   ├── accounting-core/        # Pure TypeScript double-entry math, COA & financial calculators
│   ├── database/               # Prisma ORM schema, migrations, and PostgreSQL client
│   ├── gst-provider/           # Statutory Indian GST, e-Way Bill, e-Invoice & crypto engine
│   ├── shared-types/           # Shared TypeScript interfaces, DTOs, and domain enums
│   └── tsconfig/               # Shared base TypeScript configurations across monorepo
├── docs/                       # High-level architecture, statutory rules, and audit reports
├── scripts/                    # Shell and PowerShell operations scripts (backup, restore)
├── project-audit/              # [Current Audit] Technical audit and documentation suite
├── .env.example                # Canonical template for all environment configurations
├── docker-compose.yml          # Containerized PostgreSQL 16 & Redis 7 services
├── package.json                # Root scripts and dev dependencies
├── pnpm-workspace.yaml         # Workspace package path definitions
└── turbo.json                  # Turborepo task pipeline definition
```

---

## 2. Workspace Configuration Files

### 2.1 `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```
Defines all subdirectories within `apps/` and `packages/` as first-class workspace packages. Dependencies between packages use the `workspace:*` protocol (e.g. `@billing/shared-types: "workspace:*"`), ensuring zero symlink drift and atomic local builds.

### 2.2 `package.json` (Root)
- **Name:** `billing-monorepo` (v0.1.0)
- **Package Manager:** `pnpm@9.15.0`
- **Root Scripts:**
  - `dev`: `pnpm --parallel --filter "./apps/*" dev` — Starts both Next.js (port 3000) and NestJS (port 4000) concurrently with streaming logs.
  - `dev:web`: `pnpm --filter @billing/web dev` — Runs web application only.
  - `dev:api`: `pnpm --filter @billing/api dev` — Runs backend API only.
  - `build`: `turbo run build` — Compiles packages topologically (packages first, then apps).
  - `db:generate`: `pnpm --filter @billing/database db:generate` — Generates Prisma Client.
  - `db:migrate`: `pnpm --filter @billing/database db:migrate` — Executes pending Prisma migrations.
  - `db:push`: `pnpm --filter @billing/database db:push` — Synchronizes schema directly to PostgreSQL.
  - `test`: `turbo run test` — Runs Vitest across all test suites.
  - `lint`: `turbo run lint` — Runs ESLint across Next.js and NestJS.
  - `format`: `prettier --write "**/*.{ts,tsx,md,json}"` — Codespace formatting.

### 2.3 `turbo.json`
Specifies pipeline task dependency graphs:
- `build`: Depends on `^build` (dependencies built first). Outputs `.next/**`, `dist/**`.
- `dev`: `cache: false`, `persistent: true`.
- `lint`: Depends on `^build`.
- `test`: Depends on `^build`. Inputs include `src/**/*.ts`, `src/**/*.tsx`.
- `db:generate`: `cache: false`.

---

## 3. Directory Breakdown: `apps/web` (Next.js Frontend)

The Next.js 14 application uses the modern **App Router** (`src/app/`) with TypeScript and Tailwind CSS.

```
apps/web/
├── public/
│   ├── favicon.ico
│   ├── icon-192.png, icon-512.png  # PWA app icons
│   ├── logo.png                    # Brand logo
│   └── manifest.json               # Web App Manifest for mobile installation
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root HTML layout with AuthProvider & metadata
│   │   ├── page.tsx                # Main Dashboard with metrics, charts & quick actions
│   │   ├── login/
│   │   │   └── page.tsx            # Login with phone, password & demo credentials helper
│   │   ├── sales/
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx        # Sales invoice list with search, status & print
│   │   │   │   ├── new/page.tsx    # Create invoice form with tax buckets & line items
│   │   │   │   └── [id]/page.tsx   # Invoice detail view, e-Way, e-Invoice & PDF action
│   │   │   ├── pos/
│   │   │   │   └── page.tsx        # High-speed POS counter billing screen
│   │   │   ├── returns/
│   │   │   │   └── page.tsx        # Sales returns & Credit Notes management
│   │   │   └── delivery-challans/
│   │   │       └── page.tsx        # Delivery challans (job work / supply / returnable)
│   │   ├── purchases/
│   │   │   ├── page.tsx            # Inward purchase invoices register & entry
│   │   │   ├── returns/page.tsx    # Purchase returns & Debit Notes
│   │   │   └── components/
│   │   │       └── bill-scanner-modal.tsx # AI/OCR camera & PDF purchase bill extractor
│   │   ├── masters/
│   │   │   ├── items/page.tsx      # Product master with HSN, GST rate & stock
│   │   │   ├── parties/page.tsx    # Customer & Vendor CRM with GSTIN lookup
│   │   │   ├── categories/page.tsx # Item categories
│   │   │   ├── units/page.tsx      # Units of measure (PCS, KGS, MTR, etc.)
│   │   │   ├── batches/page.tsx    # Batch inventory with manufacturing & expiry dates
│   │   │   └── warehouses/page.tsx # Godowns and stock storage locations
│   │   ├── finance/
│   │   │   ├── expenses/page.tsx   # Direct & Indirect expense vouchers
│   │   │   ├── vouchers/page.tsx   # General ledger vouchers (Journal, Contra, Receipt)
│   │   │   ├── ledgers/page.tsx    # Chart of Accounts & ledger statement inquiry
│   │   │   └── reports/page.tsx    # Financial Statements (P&L, Balance Sheet, Trial Balance)
│   │   ├── gst/
│   │   │   └── page.tsx            # GST Portal integration, GSTR-1, GSTR-3B & GSTR-2B
│   │   ├── manufacturing/
│   │   │   ├── bom/page.tsx        # Bill of Materials recipes
│   │   │   └── orders/page.tsx     # Production work orders & consumption journals
│   │   ├── distribution/
│   │   │   └── stock-transfers/page.tsx # Inter-warehouse & branch stock transfers
│   │   ├── reports/
│   │   │   └── page.tsx            # Sales register, purchase register & stock valuation
│   │   └── settings/
│   │       └── page.tsx            # Company profile, GSTIN, branch configuration & security
│   ├── components/
│   │   ├── gst/gst-kit.tsx         # GST status badge, validation pill & tax calculation widgets
│   │   ├── layout/app-shell.tsx    # Sidebar, topbar, branch/company switcher & language toggle
│   │   ├── pwa-register.tsx        # Service worker registration hook
│   │   └── ui/                     # Badge, modal dialog, stat cards
│   ├── context/
│   │   └── auth-context.tsx        # User session, JWT tokens, active company & active branch state
│   ├── lib/
│   │   └── api-client.ts           # Centralized Fetch wrapper with automatic tenant headers & auth
│   └── styles/
│       └── globals.css             # Tailwind base, utilities, font configuration
├── package.json                    # Dependencies: Next 14, React 18, Tailwind, lucide-react
├── postcss.config.js               # PostCSS plugins (autoprefixer, tailwindcss)
├── tailwind.config.ts              # Custom colors (amber/saffron theme), animations
└── tsconfig.json                   # TypeScript config extending @billing/tsconfig/nextjs.json
```

---

## 4. Directory Breakdown: `apps/api` (NestJS Fastify Backend)

The backend is built with NestJS 10 on the Fastify platform for ultra-low latency and high throughput.

```
apps/api/
├── src/
│   ├── main.ts                     # Fastify bootstrap, CORS, validation pipe & startup checks
│   ├── app.module.ts               # Root module configuring global guards, filters & interceptors
│   ├── audit/                      # Hash-chained tamper-evident audit logging service
│   ├── auth/                       # JWT authentication, login, registration, branch context switch
│   ├── batches/                    # Batch creation, tracking & expiry checks
│   ├── categories/                 # Item categorization CRUD
│   ├── common/                     # Decorators (@CurrentUser, @Public), Guards, Interceptors
│   ├── database/                   # DatabaseService wrapping Prisma with TenantContext transactions
│   ├── distribution/               # StockTransfers, DeliveryChallans controllers and services
│   ├── gst/                        # GSTR-2B reconciliation, e-Invoice, e-Way Bill & Sandbox ping
│   ├── health/                     # Liveness and database connectivity readiness probes
│   ├── invoices/                   # Sales billing, auto-numbering, GST calculations, PDF generator
│   ├── items/                      # Product catalogue, pricing, barcode, stock levels
│   ├── ledgers/                    # Chart of accounts, account statements, ledger groups
│   ├── manufacturing/              # BOM recipes and ProductionOrders controllers & services
│   ├── parties/                    # Customers & Suppliers master, GSTIN validation, balance
│   ├── purchases/                  # Inward invoices, OCR scanner engine, returns, payments
│   ├── reconciliation/             # Stock-to-GL inventory reconciliation, transit losses, journals
│   ├── reports/                    # GSTR-1, GSTR-3B, Sales Register, Stock Summary, P&L, Balance Sheet
│   ├── tenants/                    # Multi-tenant management: Organizations, Companies, Branches, FYs
│   ├── units/                      # Units of measure CRUD
│   └── vouchers/                   # Double-entry ledger vouchers (Payment, Receipt, Journal, Contra)
├── test/                           # 27 integration, unit, security, and CA audit test specifications
│   ├── fixtures/                   # OCR test PDF and image samples
│   ├── accounting.integration.spec.ts
│   ├── auth.security.spec.ts
│   ├── distribution.integration.spec.ts
│   ├── gst-compliance.integration.spec.ts
│   ├── pilot-execution.spec.ts
│   └── tenant-isolation-rls.spec.ts
├── package.json                    # Dependencies: NestJS 10, Fastify, Prisma, bcryptjs, tesseract.js
└── tsconfig.json                   # TypeScript config extending @billing/tsconfig/node.json
```

---

## 5. Directory Breakdown: `packages/` (Core Libraries)

### 5.1 `packages/accounting-core`
Standalone mathematical and statutory accounting library with zero database or framework dependencies:
- `src/decimal.ts`: Fixed-point arbitrary-precision math wrapper using Decimal.js.
- `src/rounding.ts`: Indian currency rounding (Banker's rounding vs standard half-up to 2 decimal places).
- `src/tax-calculator.ts`: Intra-state (CGST+SGST) vs interstate (IGST) tax apportionment, reverse charge, cess.
- `src/chart-of-accounts.template.ts`: Predefined standard Indian SME Chart of Accounts (143+ statutory accounts).
- `src/balance-invariants.ts`: Double-entry validation: $\sum \text{Debit} - \sum \text{Credit} = 0.00$.
- `src/moving-average.ts`: Weighted-average inventory valuation algorithm under AS-2.
- `src/number-to-words.ts`: Indian numbering system converter (Lakhs & Crores, e.g. "Rupees One Lakh Twenty Thousand Only").
- `src/period-lock.ts`: Financial year closure and lock boundary validations.
- `src/financial-statements.ts`: Mathematical aggregation for Trial Balance, Balance Sheet, and P&L.

### 5.2 `packages/database`
PostgreSQL persistence layer:
- `prisma/schema.prisma`: 1,596 lines of schema defining 52 relational models and enums.
- `prisma/migrations/`: 15 chronological SQL migrations including PostgreSQL Row-Level Security policies and roles (`billing_app`).
- `src/index.ts`: Re-exports `@prisma/client` and custom `createPrismaClient` factory.

### 5.3 `packages/gst-provider`
Statutory Indian GST and government integration utilities:
- `src/nic-provider.ts`: NIC e-Way Bill & e-Invoice client connecting to Sandbox / Production APIs.
- `src/secret-box.ts`: Authenticated encryption (AES-256-GCM) for storing government client secrets and passwords.
- `src/gstr2b-parse.ts`: Parser for official government GSTR-2B JSON format.
- `src/gstr2b-match.ts`: Reconciliation algorithm matching purchase invoices against supplier-filed GSTR-2B lines.
- `src/itc-settlement.ts`: Rules for Input Tax Credit eligibility and reverse charge adjustments.

### 5.4 `packages/shared-types`
Single source of truth for contracts:
- `src/index.ts`: Enums (`UserRole`, `SubscriptionTier`, `GstRegistrationType`, `VoucherType`, `PaymentMode`, `StockTransactionType`, `DeliveryChallanType`), interfaces (`TenantContext`, `InvoiceItemDto`, `TaxSummary`, `ApiResponse`), and common DTO definitions.

### 5.5 `packages/tsconfig`
- `base.json`: Base TypeScript compiler options (strict, ES2022).
- `nextjs.json`: Next.js specific compiler options (JSX preserve, DOM libs).
- `node.json`: Node.js / NestJS compiler options (CommonJS/ESM interop, decorators).
