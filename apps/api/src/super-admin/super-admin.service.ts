import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../audit/audit.service";
import { SubscriptionTier, UserRole } from "@billing/shared-types";
import * as bcrypt from "bcryptjs";

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * System-wide statistics for the platform overview
   */
  async getStats() {
    return this.prisma.executeBypassRls(async (tx) => {
      const now = new Date();

      const [
        totalTenants,
        activeTenants,
        trialTenants,
        expiredTenants,
        totalOrgs,
        totalCompanies,
        totalBranches,
        totalUsers,
        activeUsers,
        totalInvoices,
        invoiceAggregate,
        tenantsByTier,
        recentAuditLogs,
      ] = await Promise.all([
        tx.tenant.count(),
        tx.tenant.count({ where: { isActive: true } }),
        tx.tenant.count({ where: { subscriptionTier: SubscriptionTier.TRIAL } }),
        tx.tenant.count({ where: { subscriptionEnds: { lt: now } } }),
        tx.organization.count(),
        tx.company.count(),
        tx.branch.count(),
        tx.user.count(),
        tx.user.count({ where: { isActive: true } }),
        tx.salesInvoice.count(),
        tx.salesInvoice.aggregate({
          _sum: { grandTotal: true },
        }),
        tx.tenant.groupBy({
          by: ["subscriptionTier"],
          _count: { _all: true },
        }),
        tx.auditLog.count(),
      ]);

      const tierBreakdown: Record<string, number> = {
        TRIAL: 0,
        RETAIL_BASIC: 0,
        WHOLESALE_PRO: 0,
        DISTRIBUTION_ENTERPRISE: 0,
        MANUFACTURING_SUITE: 0,
      };

      for (const t of tenantsByTier) {
        tierBreakdown[t.subscriptionTier] = t._count._all;
      }

      return {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          suspended: totalTenants - activeTenants,
          trial: trialTenants,
          expired: expiredTenants,
        },
        subscriptionTiers: tierBreakdown,
        infrastructure: {
          organizations: totalOrgs,
          companies: totalCompanies,
          branches: totalBranches,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        businessVolume: {
          totalInvoices,
          grossVolume: Number(invoiceAggregate._sum.grandTotal || 0),
        },
        systemHealth: {
          databaseStatus: "CONNECTED",
          rlsStatus: "ACTIVE",
          totalAuditEvents: recentAuditLogs,
          uptimeSeconds: process.uptime(),
          nodeVersion: process.version,
          timestamp: new Date().toISOString(),
        },
      };
    });
  }

  /**
   * List tenants with details
   */
  async getTenants(query: {
    search?: string;
    tier?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
    const skip = (page - 1) * limit;

    return this.prisma.executeBypassRls(async (tx) => {
      const where: any = {};

      if (query.tier) {
        where.subscriptionTier = query.tier as SubscriptionTier;
      }

      if (query.status === "active") {
        where.isActive = true;
      } else if (query.status === "inactive" || query.status === "suspended") {
        where.isActive = false;
      } else if (query.status === "expired") {
        where.subscriptionEnds = { lt: new Date() };
      }

      if (query.search) {
        const s = query.search.trim();
        where.OR = [
          { primaryPhone: { contains: s, mode: "insensitive" } },
          { primaryEmail: { contains: s, mode: "insensitive" } },
          {
            organizations: {
              some: {
                name: { contains: s, mode: "insensitive" },
              },
            },
          },
        ];
      }

      const [total, tenants] = await Promise.all([
        tx.tenant.count({ where }),
        tx.tenant.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            organizations: {
              include: {
                companies: {
                  include: {
                    branches: true,
                    _count: {
                      select: { salesInvoices: true },
                    },
                  },
                },
                users: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    role: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        data: tenants.map((t) => ({
          id: t.id,
          primaryPhone: t.primaryPhone,
          primaryEmail: t.primaryEmail,
          subscriptionTier: t.subscriptionTier,
          subscriptionEnds: t.subscriptionEnds,
          isActive: t.isActive,
          createdAt: t.createdAt,
          organizations: t.organizations.map((org) => ({
            id: org.id,
            name: org.name,
            legalName: org.legalName,
            userCount: org.users.length,
            users: org.users,
            companies: org.companies.map((c) => ({
              id: c.id,
              legalName: c.legalName,
              tradeName: c.tradeName,
              gstin: c.gstin,
              city: c.city,
              stateCode: c.stateCode,
              branchesCount: c.branches.length,
              invoicesCount: c._count.salesInvoices,
            })),
          })),
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  /**
   * Update tenant subscription or active status
   */
  async updateTenant(
    tenantId: string,
    dto: {
      subscriptionTier?: SubscriptionTier;
      subscriptionEnds?: string;
      isActive?: boolean;
    },
    superAdminUserId: string,
  ) {
    return this.prisma.executeBypassRls(async (tx) => {
      const existing = await tx.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!existing) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found.`);
      }

      const updateData: any = {};
      if (dto.subscriptionTier) {
        updateData.subscriptionTier = dto.subscriptionTier;
      }
      if (dto.subscriptionEnds) {
        updateData.subscriptionEnds = new Date(dto.subscriptionEnds);
      }
      if (typeof dto.isActive === "boolean") {
        updateData.isActive = dto.isActive;
      }

      const updated = await tx.tenant.update({
        where: { id: tenantId },
        data: updateData,
      });

      // Audit log
      const firstOrg = await tx.organization.findFirst({
        where: { tenantId },
        include: { companies: true },
      });
      if (firstOrg && firstOrg.companies[0]) {
        await this.audit.record({
          organizationId: firstOrg.id,
          companyId: firstOrg.companies[0].id,
          userId: superAdminUserId,
          action: "SUPERADMIN_TENANT_UPDATE",
          entityName: "Tenant",
          entityId: tenantId,
          previousState: existing as any,
          newState: updated as any,
        });
      }

      return updated;
    });
  }

  /**
   * Get all users across platform with filtering
   */
  async getUsers(query: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
    const skip = (page - 1) * limit;

    return this.prisma.executeBypassRls(async (tx) => {
      const where: any = {};

      if (query.role) {
        where.role = query.role as UserRole;
      }

      if (query.status === "active") {
        where.isActive = true;
      } else if (query.status === "inactive") {
        where.isActive = false;
      }

      if (query.search) {
        const s = query.search.trim();
        where.OR = [
          { fullName: { contains: s, mode: "insensitive" } },
          { phone: { contains: s, mode: "insensitive" } },
          { email: { contains: s, mode: "insensitive" } },
          {
            organization: {
              name: { contains: s, mode: "insensitive" },
            },
          },
        ];
      }

      const [total, users] = await Promise.all([
        tx.user.count({ where }),
        tx.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                tenantId: true,
              },
            },
          },
        }),
      ]);

      return {
        data: users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          phone: u.phone,
          email: u.email,
          role: u.role,
          preferredLang: u.preferredLang,
          isActive: u.isActive,
          createdAt: u.createdAt,
          organization: u.organization,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  /**
   * Update user role, status or password
   */
  async updateUser(
    userId: string,
    dto: {
      role?: UserRole;
      isActive?: boolean;
      newPassword?: string;
    },
    superAdminUserId: string,
  ) {
    return this.prisma.executeBypassRls(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!existing) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      const data: any = {};
      if (dto.role) data.role = dto.role;
      if (typeof dto.isActive === "boolean") data.isActive = dto.isActive;
      if (dto.newPassword) {
        if (dto.newPassword.length < 8) {
          throw new BadRequestException("Password must be at least 8 characters long.");
        }
        data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data,
      });

      return {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        isActive: updated.isActive,
      };
    });
  }

  /**
   * Get platform-wide audit logs
   */
  async getAuditLogs(query: { limit?: number; action?: string }) {
    const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));

    return this.prisma.executeBypassRls(async (tx) => {
      const where: any = {};
      if (query.action) {
        where.action = query.action;
      }

      return tx.auditLog.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              role: true,
            },
          },
          company: {
            select: {
              id: true,
              tradeName: true,
              legalName: true,
            },
          },
        },
      });
    });
  }

  /**
   * Masquerade / Impersonate a tenant context for inspection
   */
  async impersonateCompany(companyId: string) {
    return this.prisma.executeBypassRls(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        include: {
          organization: true,
          branches: true,
          financialYears: {
            where: { isCurrent: true },
          },
        },
      });

      if (!company) {
        throw new NotFoundException(`Company with ID ${companyId} not found.`);
      }

      const branch = company.branches[0] || null;
      const fy = company.financialYears[0] || null;

      return {
        organizationId: company.organizationId,
        organizationName: company.organization.name,
        companyId: company.id,
        companyName: company.tradeName,
        branchId: branch?.id,
        branchName: branch?.name,
        financialYearId: fy?.id,
        financialYear: fy?.name,
      };
    });
  }

  /**
   * Provision a new tenant directly from SuperAdmin Console
   */
  async createTenant(
    dto: {
      phone: string;
      email?: string;
      fullName: string;
      password?: string;
      organizationName: string;
      subscriptionTier?: SubscriptionTier;
      daysValid?: number;
      stateCode?: string;
    },
    superAdminUserId: string,
  ) {
    return this.prisma.executeBypassRls(async (tx) => {
      const existing = await tx.tenant.findFirst({
        where: { primaryPhone: dto.phone },
      });
      if (existing) {
        throw new BadRequestException(`Tenant with phone ${dto.phone} already exists.`);
      }

      const tier = dto.subscriptionTier || SubscriptionTier.TRIAL;
      const days = dto.daysValid || 30;
      const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const tenant = await tx.tenant.create({
        data: {
          primaryPhone: dto.phone,
          primaryEmail: dto.email || null,
          subscriptionTier: tier,
          subscriptionEnds: endsAt,
          isActive: true,
        },
      });

      const org = await tx.organization.create({
        data: {
          tenantId: tenant.id,
          name: dto.organizationName,
          legalName: dto.organizationName,
        },
      });

      const stateCode = dto.stateCode || "24";
      const company = await tx.company.create({
        data: {
          organizationId: org.id,
          legalName: dto.organizationName,
          tradeName: dto.organizationName,
          stateCode,
          city: "Ahmedabad",
          addressLine1: "Commercial Market Center",
          pincode: "380001",
          phone: dto.phone,
          email: dto.email || null,
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          companyId: company.id,
          name: "Main Branch",
          code: "BR01",
          isMainBranch: true,
          city: "Ahmedabad",
          addressLine1: "Commercial Market Center",
          pincode: "380001",
          stateCode,
          phone: dto.phone,
        },
      });

      const fy = await tx.financialYear.create({
        data: {
          companyId: company.id,
          name: "FY 2026-27",
          startDate: new Date("2026-04-01T00:00:00.000Z"),
          endDate: new Date("2027-03-31T23:59:59.999Z"),
          isCurrent: true,
          isLocked: false,
        },
      });

      const pwd = dto.password || "Password123#";
      const passwordHash = await bcrypt.hash(pwd, 10);

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email || `${dto.phone}@billing.local`,
          passwordHash,
          role: UserRole.COMPANY_ADMIN,
          preferredLang: "en",
        },
      });

      await tx.userBranchAssignment.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          role: UserRole.COMPANY_ADMIN,
          isDefault: true,
        },
      });

      await this.audit.record({
        organizationId: org.id,
        companyId: company.id,
        userId: superAdminUserId,
        action: "SUPERADMIN_CREATE_TENANT",
        entityName: "Tenant",
        entityId: tenant.id,
        newState: {
          tenantId: tenant.id,
          phone: tenant.primaryPhone,
          tier: tenant.subscriptionTier,
        },
      });

      return { tenant, organization: org, company, branch, user };
    });
  }
}
