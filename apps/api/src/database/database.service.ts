import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient, Prisma } from "@billing/database";
import { TenantContext } from "@billing/shared-types";

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);
  private roleCapabilitiesPromise: Promise<{
    isSuperuser: boolean;
    hasAppRole: boolean;
  }> | null = null;

  async onModuleInit() {
    try {
      await this.$connect();
      await this.detectRoleCapabilities();
    } catch {
      // Allow startup in environments without active DB
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Inspect current database connection privileges to avoid issuing illegal SET LOCAL ROLE
   * commands that would abort the transaction on non-superuser managed databases (e.g. Render, RDS).
   */
  async detectRoleCapabilities(): Promise<{
    isSuperuser: boolean;
    hasAppRole: boolean;
  }> {
    if (this.roleCapabilitiesPromise) {
      return this.roleCapabilitiesPromise;
    }

    this.roleCapabilitiesPromise = (async () => {
      try {
        const rows = await this.$queryRaw<
          Array<{ is_superuser: boolean; has_app_role: boolean }>
        >`
          SELECT 
            COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) AS is_superuser,
            EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'billing_app') AS has_app_role;
        `;
        if (rows && rows.length > 0) {
          return {
            isSuperuser: Boolean(rows[0].is_superuser),
            hasAppRole: Boolean(rows[0].has_app_role),
          };
        }
      } catch (err) {
        this.logger.debug(
          `Could not inspect pg_roles (non-superuser or restricted environment), assuming unprivileged role: ${(err as Error).message}`,
        );
      }
      return { isSuperuser: false, hasAppRole: false };
    })();

    return this.roleCapabilitiesPromise;
  }

  /**
   * Execute callback inside a transaction configured with PostgreSQL Row-Level Security session variables.
   * This guarantees connection-pool safety because `set_config(..., ..., true)` is local to the transaction
   * and automatically resets when the transaction commits or rolls back.
   */
  async executeInTenantContext<T>(
    ctx: TenantContext,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const caps = await this.detectRoleCapabilities();

    return this.$transaction(async (tx) => {
      try {
        if (ctx.isSystemBypass) {
          await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        } else {
          await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

          // Only superusers need to downgrade role to test RLS policies.
          // Non-superusers are already subject to FORCE ROW LEVEL SECURITY.
          // Executing SET LOCAL ROLE as a non-superuser throws 42501 which aborts PostgreSQL transactions.
          if (caps.isSuperuser && caps.hasAppRole) {
            await tx.$executeRawUnsafe(`
              DO $$
              BEGIN
                SET LOCAL ROLE billing_app;
              EXCEPTION WHEN OTHERS THEN
                NULL;
              END $$;
            `);
          }

          if (ctx.organizationId) {
            await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${ctx.organizationId}, true)`;
          }
          if (ctx.companyId) {
            await tx.$executeRaw`SELECT set_config('app.current_company_id', ${ctx.companyId}, true)`;
          }
        }

        return await callback(tx);
      } catch (err: any) {
        const errorCode = err?.code || err?.meta?.code || "UNKNOWN";
        const errorMsg = err?.message
          ? err.message.split("\n")[0]
          : "Database operation failed";
        this.logger.error(
          `Tenant transaction failure [errorCode=${errorCode}]: ${errorMsg}`,
        );
        throw err;
      }
    });
  }

  /**
   * Execute a query bypassing RLS within a dedicated transaction (e.g. for registration, migrations)
   */
  async executeBypassRls<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const caps = await this.detectRoleCapabilities();

    return this.$transaction(async (tx) => {
      try {
        if (caps.isSuperuser && caps.hasAppRole) {
          await tx.$executeRawUnsafe(`
            DO $$
            BEGIN
              RESET ROLE;
            EXCEPTION WHEN OTHERS THEN
              NULL;
            END $$;
          `);
        }
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        return await callback(tx);
      } catch (err: any) {
        const errorCode = err?.code || err?.meta?.code || "UNKNOWN";
        const errorMsg = err?.message
          ? err.message.split("\n")[0]
          : "Database bypass operation failed";
        this.logger.error(
          `Bypass transaction failure [errorCode=${errorCode}]: ${errorMsg}`,
        );
        throw err;
      }
    });
  }
}
