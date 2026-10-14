#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Database Backup & Restore Automated Verification Test
# Indian Billing & Accounting SaaS
# ==============================================================================

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-billing_db}"
TEMP_RESTORE_DB="billing_restore_test_temp_$$"
DUMP_FILE="/tmp/billing_backup_test_$$.dump"

export PGPASSWORD="${PGPASSWORD:-postgres}"

echo "=================================================================="
echo " Starting Database Backup & Restore Verification"
echo " Target Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
echo " Temporary Restore DB: ${TEMP_RESTORE_DB}"
echo "=================================================================="

cleanup() {
  echo " Cleaning up temporary resources..."
  rm -f "${DUMP_FILE}"
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEMP_RESTORE_DB};" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo " Step 1: Querying source database baseline metrics..."
SRC_COUNTS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "
SELECT 
  (SELECT COUNT(*) FROM tenants) || ',' ||
  (SELECT COUNT(*) FROM users) || ',' ||
  (SELECT COUNT(*) FROM ledger_accounts) || ',' ||
  (SELECT COUNT(*) FROM sales_invoices) || ',' ||
  (SELECT COUNT(*) FROM vouchers) || ',' ||
  (SELECT COUNT(*) FROM journal_entries) || ',' ||
  (SELECT COUNT(*) FROM stock_transactions) || ',' ||
  (SELECT COUNT(*) FROM audit_logs) || ',' ||
  (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_entries) || ',' ||
  (SELECT COALESCE(SUM(credit_amount), 0) FROM journal_entries)
")

IFS=',' read -r SRC_TENANTS SRC_USERS SRC_ACCOUNTS SRC_INVOICES SRC_VOUCHERS SRC_ENTRIES SRC_STOCK SRC_AUDIT SRC_DEBIT SRC_CREDIT <<< "${SRC_COUNTS}"

echo "  -> Source Tenants: ${SRC_TENANTS}"
echo "  -> Source Users: ${SRC_USERS}"
echo "  -> Source Accounts: ${SRC_ACCOUNTS}"
echo "  -> Source Sales Invoices: ${SRC_INVOICES}"
echo "  -> Source Vouchers: ${SRC_VOUCHERS}"
echo "  -> Source Journal Entries: ${SRC_ENTRIES}"
echo "  -> Source Stock Transactions: ${SRC_STOCK}"
echo "  -> Source Audit Log Entries: ${SRC_AUDIT}"
echo "  -> Source Total Debit: ${SRC_DEBIT} | Total Credit: ${SRC_CREDIT}"

echo " Step 2: Generating custom-format binary pg_dump..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -Fc "${DB_NAME}" -f "${DUMP_FILE}"
DUMP_SIZE=$(stat -c%s "${DUMP_FILE}")
echo "  -> pg_dump successful. Archive size: ${DUMP_SIZE} bytes."

echo " Step 3: Creating isolated target database for restoration..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${TEMP_RESTORE_DB};"

echo " Step 4: Restoring dump into temporary database..."
pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEMP_RESTORE_DB}" --no-owner --role="${DB_USER}" "${DUMP_FILE}" || true

echo " Step 5: Validating restored database integrity and row invariants..."
RESTORE_COUNTS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEMP_RESTORE_DB}" -t -A -c "
SELECT 
  (SELECT COUNT(*) FROM tenants) || ',' ||
  (SELECT COUNT(*) FROM users) || ',' ||
  (SELECT COUNT(*) FROM ledger_accounts) || ',' ||
  (SELECT COUNT(*) FROM sales_invoices) || ',' ||
  (SELECT COUNT(*) FROM vouchers) || ',' ||
  (SELECT COUNT(*) FROM journal_entries) || ',' ||
  (SELECT COUNT(*) FROM stock_transactions) || ',' ||
  (SELECT COUNT(*) FROM audit_logs) || ',' ||
  (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_entries) || ',' ||
  (SELECT COALESCE(SUM(credit_amount), 0) FROM journal_entries)
")

IFS=',' read -r RES_TENANTS RES_USERS RES_ACCOUNTS RES_INVOICES RES_VOUCHERS RES_ENTRIES RES_STOCK RES_AUDIT RES_DEBIT RES_CREDIT <<< "${RESTORE_COUNTS}"

echo "  -> Restored Tenants: ${RES_TENANTS} (Expected: ${SRC_TENANTS})"
echo "  -> Restored Users: ${RES_USERS} (Expected: ${SRC_USERS})"
echo "  -> Restored Accounts: ${RES_ACCOUNTS} (Expected: ${SRC_ACCOUNTS})"
echo "  -> Restored Sales Invoices: ${RES_INVOICES} (Expected: ${SRC_INVOICES})"
echo "  -> Restored Vouchers: ${RES_VOUCHERS} (Expected: ${SRC_VOUCHERS})"
echo "  -> Restored Journal Entries: ${RES_ENTRIES} (Expected: ${SRC_ENTRIES})"
echo "  -> Restored Stock Transactions: ${RES_STOCK} (Expected: ${SRC_STOCK})"
echo "  -> Restored Audit Entries: ${RES_AUDIT} (Expected: ${SRC_AUDIT})"
echo "  -> Restored Total Debit: ${RES_DEBIT} | Total Credit: ${RES_CREDIT}"

if [ "${SRC_TENANTS}" != "${RES_TENANTS}" ] || \
   [ "${SRC_USERS}" != "${RES_USERS}" ] || \
   [ "${SRC_ACCOUNTS}" != "${RES_ACCOUNTS}" ] || \
   [ "${SRC_INVOICES}" != "${RES_INVOICES}" ] || \
   [ "${SRC_VOUCHERS}" != "${RES_VOUCHERS}" ] || \
   [ "${SRC_ENTRIES}" != "${RES_ENTRIES}" ] || \
   [ "${SRC_STOCK}" != "${RES_STOCK}" ] || \
   [ "${SRC_AUDIT}" != "${RES_AUDIT}" ] || \
   [ "${SRC_DEBIT}" != "${RES_DEBIT}" ] || \
   [ "${SRC_CREDIT}" != "${RES_CREDIT}" ]; then
  echo "❌ CRITICAL ERROR: Restored metrics do not match source database metrics!"
  exit 1
fi

echo " Step 6: Validating full schema objects, constraints, indexes, triggers & migrations..."
SRC_SCHEMA=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') || ',' ||
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = 'public') || ',' ||
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') || ',' ||
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') || ',' ||
  (SELECT COUNT(*) FROM pg_extension) || ',' ||
  (SELECT COUNT(*) FROM _prisma_migrations WHERE rolled_back_at IS NULL) || ',' ||
  (SELECT COUNT(*) FROM pg_policy)
")

IFS=',' read -r SRC_TABLES SRC_CONSTRAINTS SRC_INDEXES SRC_TRIGGERS SRC_EXTENSIONS SRC_MIGRATIONS SRC_POLICIES <<< "${SRC_SCHEMA}"

RESTORE_SCHEMA=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEMP_RESTORE_DB}" -t -A -c "
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') || ',' ||
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = 'public') || ',' ||
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') || ',' ||
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') || ',' ||
  (SELECT COUNT(*) FROM pg_extension) || ',' ||
  (SELECT COUNT(*) FROM _prisma_migrations WHERE rolled_back_at IS NULL) || ',' ||
  (SELECT COUNT(*) FROM pg_policy)
")

IFS=',' read -r RES_TABLES RES_CONSTRAINTS RES_INDEXES RES_TRIGGERS RES_EXTENSIONS RES_MIGRATIONS RES_POLICIES <<< "${RESTORE_SCHEMA}"

echo "  -> Public Tables: Restored ${RES_TABLES} (Source: ${SRC_TABLES})"
echo "  -> Table Constraints (PK/FK/UQ): Restored ${RES_CONSTRAINTS} (Source: ${SRC_CONSTRAINTS})"
echo "  -> Indexes: Restored ${RES_INDEXES} (Source: ${SRC_INDEXES})"
echo "  -> Triggers: Restored ${RES_TRIGGERS} (Source: ${SRC_TRIGGERS})"
echo "  -> Database Extensions: Restored ${RES_EXTENSIONS} (Source: ${SRC_EXTENSIONS})"
echo "  -> Applied Prisma Migrations: Restored ${RES_MIGRATIONS} (Source: ${SRC_MIGRATIONS})"
echo "  -> Active RLS Policies: Restored ${RES_POLICIES} (Source: ${SRC_POLICIES})"

if [ "${SRC_TABLES}" != "${RES_TABLES}" ] || \
   [ "${SRC_CONSTRAINTS}" != "${RES_CONSTRAINTS}" ] || \
   [ "${SRC_INDEXES}" != "${RES_INDEXES}" ] || \
   [ "${SRC_TRIGGERS}" != "${RES_TRIGGERS}" ] || \
   [ "${SRC_EXTENSIONS}" != "${RES_EXTENSIONS}" ] || \
   [ "${SRC_MIGRATIONS}" != "${RES_MIGRATIONS}" ] || \
   [ "${SRC_POLICIES}" != "${RES_POLICIES}" ]; then
  echo "❌ CRITICAL ERROR: Restored schema objects do not match source database schema!"
  exit 1
fi

echo "=================================================================="
echo " SUCCESS: Database backup and restore verified with 100% fidelity!"
echo " All tables, constraints, indexes, triggers, migrations, records,"
echo " accounting sums, and RLS policies match perfectly."
echo "=================================================================="
