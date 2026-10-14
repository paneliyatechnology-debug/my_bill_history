import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient, Prisma } from "@billing/database";
import { TenantContext } from "@billing/shared-types";

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
    } catch {
      // Allow startup in environments without active DB
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Execute callback inside a transaction configured with PostgreSQL Row-Level Security session variables.
   * This guarantees connection-pool safety because `SET LOCAL` resets at the end of the transaction.
   */
  async executeInTenantContext<T>(
    ctx: TenantContext,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      if (ctx.isSystemBypass) {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      } else {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
        try {
          await tx.$executeRawUnsafe(`SET LOCAL ROLE billing_app`);
        } catch {
          // In environments where already non-superuser, SET LOCAL ROLE may not be needed
        }
        if (ctx.organizationId) {
          await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${ctx.organizationId}, true)`;
        }
        if (ctx.companyId) {
          await tx.$executeRaw`SELECT set_config('app.current_company_id', ${ctx.companyId}, true)`;
        }
      }

      return callback(tx);
    });
  }

  /**
   * Execute a query bypassing RLS within a dedicated transaction (e.g. for registration, migrations)
   */
  async executeBypassRls<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      try {
        await tx.$executeRawUnsafe(`RESET ROLE`);
      } catch {
        // Ignore if role reset not needed
      }
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
      return callback(tx);
    });
  }
}
