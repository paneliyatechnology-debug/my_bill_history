import { Injectable, OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface SupportSessionRecord {
  id: string;
  actor_id: string;
  target_organization_id: string;
  target_company_id: string;
  created_at: Date;
  expires_at: Date;
  is_revoked: boolean;
  revoked_at: Date | null;
  reason: string | null;
}

@Injectable()
export class SupportSessionRegistry implements OnModuleInit {
  constructor(private readonly prisma: DatabaseService) {}

  async onModuleInit() {
    await this.initTable();
  }

  async initTable(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS support_sessions (
          id VARCHAR(64) PRIMARY KEY,
          actor_id UUID NOT NULL,
          target_organization_id UUID NOT NULL,
          target_company_id UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ,
          is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
          reason TEXT
        )
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_support_sessions_lookup ON support_sessions(id, is_revoked, expires_at)
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_support_sessions_actor ON support_sessions(actor_id, is_revoked)
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_support_sessions_comp ON support_sessions(target_company_id, is_revoked)
      `);
      try {
        await this.prisma.$executeRawUnsafe(`
          GRANT ALL ON TABLE support_sessions TO billing_app
        `);
      } catch {
        // Role might not exist in mock/test
      }
    } catch {
      // Allow execution in testing or if table already configured
    }
  }

  async createSession(data: {
    id: string;
    actorId: string;
    targetOrganizationId: string;
    targetCompanyId: string;
    expiresAt: Date;
    reason?: string;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO support_sessions (id, actor_id, target_organization_id, target_company_id, expires_at, reason)
       VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::timestamptz, $6)`,
      data.id,
      data.actorId,
      data.targetOrganizationId,
      data.targetCompanyId,
      data.expiresAt.toISOString(),
      data.reason || null,
    );
  }

  async getValidSession(sessionId: string): Promise<SupportSessionRecord | null> {
    if (!sessionId) return null;
    try {
      const rows = await this.prisma.$queryRawUnsafe<SupportSessionRecord[]>(
        `SELECT id, actor_id, target_organization_id, target_company_id, created_at, expires_at, is_revoked, revoked_at, reason
         FROM support_sessions
         WHERE id = $1 AND is_revoked = FALSE AND expires_at > NOW()
         LIMIT 1`,
        sessionId,
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } catch {
      return null;
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    if (!sessionId) return;
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE support_sessions
         SET is_revoked = TRUE, revoked_at = NOW()
         WHERE id = $1 AND is_revoked = FALSE`,
        sessionId,
      );
    } catch {
      // Ignore if table not ready
    }
  }

  async revokeAllForActor(actorId: string): Promise<void> {
    if (!actorId) return;
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE support_sessions
         SET is_revoked = TRUE, revoked_at = NOW()
         WHERE actor_id = $1::uuid AND is_revoked = FALSE`,
        actorId,
      );
    } catch {
      // Ignore
    }
  }

  async revokeAllForCompany(companyId: string, actorId?: string): Promise<void> {
    if (!companyId) return;
    try {
      if (actorId) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE support_sessions
           SET is_revoked = TRUE, revoked_at = NOW()
           WHERE target_company_id = $1::uuid AND actor_id = $2::uuid AND is_revoked = FALSE`,
          companyId,
          actorId,
        );
      } else {
        await this.prisma.$executeRawUnsafe(
          `UPDATE support_sessions
           SET is_revoked = TRUE, revoked_at = NOW()
           WHERE target_company_id = $1::uuid AND is_revoked = FALSE`,
          companyId,
        );
      }
    } catch {
      // Ignore
    }
  }
}
