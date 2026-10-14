import { Controller, Get, Post, Put, Delete, Patch, Body, Param } from "@nestjs/common";
import { TenantsService, CreateBranchDto } from "./tenants.service";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { TenantContext, UserRole } from "@billing/shared-types";

@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get("company")
  async getCurrentCompany(@CurrentTenant() ctx: TenantContext) {
    return this.tenantsService.getCurrentCompany(ctx);
  }

  @Patch("company")
  @Roles(UserRole.COMPANY_ADMIN, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async updateCurrentCompany(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: any,
  ) {
    return this.tenantsService.updateCurrentCompany(ctx, dto);
  }

  @Get("companies")
  async getCompanies(@CurrentTenant() ctx: TenantContext) {
    return this.tenantsService.getCompanies(ctx);
  }

  @Get("branches")
  async getBranches(@CurrentTenant() ctx: TenantContext) {
    return this.tenantsService.getBranches(ctx);
  }

  @Post("branches")
  @Roles(UserRole.COMPANY_ADMIN, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async createBranch(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreateBranchDto,
  ) {
    return this.tenantsService.createBranch(ctx, dto);
  }

  @Get("financial-years")
  async getFinancialYears(@CurrentTenant() ctx: TenantContext) {
    return this.tenantsService.getFinancialYears(ctx);
  }

  @Get("warehouses")
  async getWarehouses(@CurrentTenant() ctx: TenantContext) {
    return this.tenantsService.getWarehouses(ctx);
  }

  @Post("warehouses")
  @Roles(UserRole.COMPANY_ADMIN, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async createWarehouse(
    @CurrentTenant() ctx: TenantContext,
    @Body()
    dto: {
      name: string;
      isDefault?: boolean;
      address?: string;
      branchId?: string;
    },
  ) {
    return this.tenantsService.createWarehouse(ctx, dto);
  }

  @Put("warehouses/:id")
  @Roles(UserRole.COMPANY_ADMIN, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async updateWarehouse(
    @CurrentTenant() ctx: TenantContext,
    @Param("id") id: string,
    @Body()
    dto: {
      name?: string;
      isDefault?: boolean;
      address?: string;
    },
  ) {
    return this.tenantsService.updateWarehouse(ctx, id, dto);
  }

  @Delete("warehouses/:id")
  @Roles(UserRole.COMPANY_ADMIN, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async deleteWarehouse(
    @CurrentTenant() ctx: TenantContext,
    @Param("id") id: string,
  ) {
    return this.tenantsService.deleteWarehouse(ctx, id);
  }
}

