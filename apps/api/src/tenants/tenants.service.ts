import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { TenantContext } from "@billing/shared-types";

export interface CreateBranchDto {
  name: string;
  code: string;
  addressLine1: string;
  city: string;
  pincode: string;
  stateCode: string;
  phone: string;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: DatabaseService) {}

  async getCompanies(ctx: TenantContext) {
    return this.prisma.company.findMany({
      where: { organizationId: ctx.organizationId },
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        gstin: true,
        stateCode: true,
        city: true,
      },
    });
  }

  async getCurrentCompany(ctx: TenantContext) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: ctx.companyId,
        organizationId: ctx.organizationId,
      },
      include: {
        branches: true,
        financialYears: true,
      },
    });
    if (!company) {
      throw new NotFoundException("Company not found.");
    }
    return company;
  }

  async updateCurrentCompany(ctx: TenantContext, dto: any) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: ctx.companyId,
        organizationId: ctx.organizationId,
      },
    });
    if (!company) {
      throw new NotFoundException("Company not found.");
    }

    const data: any = {};
    const allowed = [
      "legalName",
      "tradeName",
      "gstin",
      "pan",
      "stateCode",
      "addressLine1",
      "addressLine2",
      "city",
      "district",
      "pincode",
      "phone",
      "email",
      "bankName",
      "bankAccountNo",
      "bankIfsc",
      "bankBranch",
      "upiVpa",
      "enableGujaratiPrint",
      "allowNegativeStock",
    ];

    for (const key of allowed) {
      if (dto[key] !== undefined) {
        data[key] = dto[key];
      }
    }

    return this.prisma.company.update({
      where: { id: ctx.companyId },
      data,
    });
  }

  async getBranches(ctx: TenantContext) {
    return this.prisma.branch.findMany({
      where: {
        organizationId: ctx.organizationId,
        companyId: ctx.companyId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        isMainBranch: true,
        city: true,
        stateCode: true,
        phone: true,
      },
    });
  }

  async createBranch(ctx: TenantContext, dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findFirst({
      where: {
        companyId: ctx.companyId,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ForbiddenException(
        `Branch with code '${dto.code}' already exists in this company.`,
      );
    }

    return this.prisma.branch.create({
      data: {
        organizationId: ctx.organizationId,
        companyId: ctx.companyId,
        name: dto.name,
        code: dto.code,
        addressLine1: dto.addressLine1,
        city: dto.city,
        pincode: dto.pincode,
        stateCode: dto.stateCode,
        phone: dto.phone,
      },
    });
  }

  async getFinancialYears(ctx: TenantContext) {
    return this.prisma.financialYear.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        isLocked: true,
      },
    });
  }

  async getWarehouses(ctx: TenantContext) {
    return this.prisma.warehouse.findMany({
      where: {
        companyId: ctx.companyId,
      },
      select: {
        id: true,
        name: true,
        isDefault: true,
        address: true,
        branchId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createWarehouse(
    ctx: TenantContext,
    dto: {
      name: string;
      isDefault?: boolean;
      address?: string;
      branchId?: string;
    },
  ) {
    let branchId = dto.branchId || ctx.branchId;
    if (!branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { companyId: ctx.companyId },
      });
      branchId = branch?.id;
    }
    if (!branchId) {
      throw new ForbiddenException("No valid branch found for warehouse.");
    }

    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { companyId: ctx.companyId },
        data: { isDefault: false },
      });
    }

    return this.prisma.warehouse.create({
      data: {
        organizationId: ctx.organizationId,
        companyId: ctx.companyId,
        branchId,
        name: dto.name,
        isDefault: dto.isDefault ?? false,
        address: dto.address,
      },
    });
  }

  async updateWarehouse(
    ctx: TenantContext,
    id: string,
    dto: { name?: string; isDefault?: boolean; address?: string },
  ) {
    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { companyId: ctx.companyId },
        data: { isDefault: false },
      });
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
      },
    });
  }

  async deleteWarehouse(ctx: TenantContext, id: string) {
    return this.prisma.warehouse.delete({
      where: { id },
    });
  }
}

