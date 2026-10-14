# Production Deployment & Disaster Recovery Plan

**Indian Billing & Accounting SaaS (Phases 1–6)**
_Document Version: 1.0 | Date: October 2026_

---

## 1. Security Hardening & Secret Management

### 1.1 Production Environment Secrets Injection

- All production credentials must be injected into the container environment via secure mechanisms (e.g., Docker Secrets, AWS Secrets Manager, HashiCorp Vault, or encrypted environment variables in Kubernetes).
- **Mandatory Environment Variables**:
  ```env
  NODE_ENV=production
  PORT=4000
  DATABASE_URL=postgresql://billing_app_user:<SECURE_PASSWORD>@db.internal:5432/billing_prod?schema=public&sslmode=require
  JWT_SECRET=<MINIMUM_32_CHAR_CRYPTO_RANDOM_SECRET>
  JWT_EXPIRES_IN=28800s
  CORS_ORIGIN=https://app.yourdomain.com
  FRONTEND_URL=https://app.yourdomain.com
  REDIS_HOST=redis.internal
  REDIS_PORT=6379
  ```
- **Failsafe**: `apps/api/src/auth/auth.module.ts` enforces an immediate fatal application exit if `JWT_SECRET` is unset or undefined when `NODE_ENV=production`.

### 1.2 Rate Limiting Protection

- Configured globally via `@nestjs/throttler` with `trustProxy: true`:
  - **Global default**: 120 requests/minute.
  - **Sensitive endpoints**:
    - `POST /api/v1/auth/login`: 5 requests/minute (prevents brute-force credential stuffing).
    - `POST /api/v1/auth/register`: 5 requests/minute.
    - `POST /api/v1/invoices/sales`: 30 requests/minute.
    - `POST /api/v1/invoices/pos-checkout`: 30 requests/minute.
- Exceeding limits returns HTTP `429 Too Many Requests`.

### 1.3 Demo Credentials and Test Data Isolation

- In `apps/web/src/app/login/page.tsx`, demo credential helper buttons are automatically hidden when `process.env.NODE_ENV === 'production'`.
- Database seeding (`prisma/seed.ts`) is restricted to non-production environments.

---

## 2. Database Backup & Disaster Recovery Runbook

### 2.1 Automated Backup Schedule & Recovery Objectives

1. **Recovery Objectives**:
   - **Recovery Point Objective (RPO)**: $< 1$ minute (achieved via continuous PostgreSQL Write-Ahead Log [WAL] shipping to offsite cloud storage).
   - **Recovery Time Objective (RTO)**: $< 30$ minutes (achieved via automated `pg_restore` of daily binary custom dump + WAL replay).
2. **Backup Schedule & Retention**:
   - **Full Daily Backups**: Binary `pg_dump -Fc` generated every 24 hours at 01:00 IST.
   - **WAL Archiving**: Continuous WAL segment archiving to encrypted object storage (S3 / GCS).
   - **Retention Matrix**:
     - Hourly WAL logs: 7 days.
     - Daily full dumps: 30 days.
     - Monthly statutory archives: 8 financial years (Section 128 of the Companies Act, 2013).
3. **Backup Encryption & Access Controls**:
   - Dump archives encrypted in transit (TLS 1.3) and at rest (AES-256 / SSE-KMS).
   - Strict IAM role separation: Backup bucket is read-only for application pods and write-only for backup daemon.
4. **Manual Recovery Steps**:
   - DNS traffic failover to secondary region if primary AWS/GCP region experiences catastrophic outage.
   - KMS customer-managed key rotation confirmation prior to restoring into fresh infrastructure.

### 2.2 Backup & Restore Verification Procedure

Execute the automated disaster recovery test before any production deployment:

```bash
./scripts/backup_restore_test.sh
```

This script performs:

1. Snapshot baseline metric count across `tenants`, `users`, `ledger_accounts`, `sales_invoices`, `vouchers`, `journal_entries`, `stock_transactions`, and `audit_logs`.
2. Validates double-entry sum ($\sum \text{Debit} = \sum \text{Credit}$).
3. Generates custom-format `pg_dump`.
4. Restores into an isolated temporary database.
5. Verifies 100% record match and intact RLS policies.
6. Drops temporary resources cleanly.

---

## 3. Database Migration & Rollback Runbook

### 3.1 Migration Execution Standard

1. **Pre-Migration Safety Dump**:
   ```bash
   pg_dump -h $DB_HOST -U $DB_USER -Fc $DB_NAME -f "/backups/pre_migration_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. **Apply Migrations**:
   ```bash
   pnpm --filter @billing/database prisma migrate deploy
   ```
3. **Post-Migration Verification**:
   Query `_prisma_migrations` to ensure all migrations applied with `applied_steps_count == total_steps`.
4. **Reproducibility Testing**:
   Migrations must be independently verified against disposable databases prior to production release:
   ```bash
   # Verified in Phase 7: Fresh migration deploy against empty database completed in < 5 seconds with 0 errors.
   ```

### 3.2 Rollback Runbook (In Case of Migration Failure)

If a migration fails or introduces data incompatibility:

1. **Immediate API Drain**: Set load balancer / gateway to maintenance mode:
   ```bash
   # Stop inbound traffic to API
   ```
2. **Restore Pre-Migration Dump**:
   ```bash
   pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME --clean --if-exists --no-owner /backups/pre_migration_<TIMESTAMP>.dump
   ```
3. **Verify Integrity**:
   Run `./scripts/backup_restore_test.sh` against the restored database.
4. **Re-route Traffic**: Resume inbound traffic once verified.

---

## 4. Production Health Monitoring & Observability

### 4.1 Health Check Probes (Kubernetes / ECS / Nomad)

- **Liveness Probe**:
  `GET /api/v1/health/liveness`
  - Returns `200 OK` with process uptime and timestamp.
  - Used by orchestrator to restart deadlocked pods (frequency: 10s, failureThreshold: 3).
- **Readiness Probe**:
  `GET /api/v1/health/readiness`
  - Returns `200 OK` after executing active `SELECT 1` query via Prisma to confirm PostgreSQL connectivity.
  - Returns `503 Service Unavailable` if database is unreachable, removing pod from load balancer pool (frequency: 5s, failureThreshold: 2).
- **Graceful Shutdown**:
  - `app.enableShutdownHooks()` enabled in Fastify bootstrap. On `SIGTERM`, Fastify stops accepting new connections and allows active requests to complete within 15 seconds before process termination.

### 4.2 Error Monitoring & Alerting

- Request correlation tracking via `CorrelationIdInterceptor` (`x-correlation-id` response header and structured JSON logging).
- Production error shielding via `HttpExceptionFilter` (suppresses stack traces and database errors from client responses).
- Actionable alerts configured for:
  - Repeated HTTP 500 spikes ($> 1\%$ of traffic).
  - Database pool exhaustion (`P2024` Prisma errors).
  - Failed financial transactions.
  - Backup script non-zero exit codes.

---

## 5. Controlled Pilot Execution Plan

Before general commercial rollout, execute a 14-day controlled pilot on a dedicated staging environment:

### Stage 1: Tenant Provisioning (Day 1–2)

- Onboard 3 pilot businesses:
  1. Retail grocer / supermarket (high-volume POS, cash payments, barcode scanning).
  2. Wholesale distributor (B2B credit sales, multi-rate GST, bill-by-bill reconciliation).
  3. Service & trading SME (inter-state supplies, SEZ supplies).

### Stage 2: End-to-End Operational Lifecycle (Day 3–10)

- Verify end-to-end transaction flows:
  - Master data setup (items, batches, HSN codes, parties, ledgers).
  - Daily sales invoicing (Cash, Credit, POS).
  - Payments and receipt voucher allocations.
  - Returns, cancellations, and credit note issuance.
  - Physical stock reconciliation.

### Stage 3: Statutory & Accounting Verification (Day 11–14)

- Run reports and match against manual books:
  - Trial Balance (Zero variance).
  - Profit & Loss Statement (Operating profit & COGS).
  - Balance Sheet (Assets = Liabilities).
  - GSTR-1 JSON export validation against GST Offline Tool.
  - Audit trail integrity inspection.
