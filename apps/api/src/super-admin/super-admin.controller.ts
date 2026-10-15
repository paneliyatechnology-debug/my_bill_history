import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole, SubscriptionTier } from "@billing/shared-types";
import { SuperAdminService } from "./super-admin.service";

@Controller("super-admin")
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get("stats")
  async getStats() {
    return this.superAdminService.getStats();
  }

  @Get("tenants")
  async getTenants(
    @Query("search") search?: string,
    @Query("tier") tier?: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.superAdminService.getTenants({ search, tier, status, page, limit });
  }

  @Post("tenants")
  async createTenant(
    @Body() dto: any,
    @CurrentUser("id") superAdminUserId: string,
  ) {
    return this.superAdminService.createTenant(dto, superAdminUserId);
  }

  @Patch("tenants/:id")
  async updateTenant(
    @Param("id") id: string,
    @Body()
    dto: {
      subscriptionTier?: SubscriptionTier;
      subscriptionEnds?: string;
      isActive?: boolean;
    },
    @CurrentUser("id") superAdminUserId: string,
  ) {
    return this.superAdminService.updateTenant(id, dto, superAdminUserId);
  }

  @Get("users")
  async getUsers(
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.superAdminService.getUsers({ search, role, status, page, limit });
  }

  @Patch("users/:id")
  async updateUser(
    @Param("id") id: string,
    @Body()
    dto: {
      role?: UserRole;
      isActive?: boolean;
      newPassword?: string;
    },
    @CurrentUser("id") superAdminUserId: string,
  ) {
    return this.superAdminService.updateUser(id, dto, superAdminUserId);
  }

  @Get("audit-logs")
  async getAuditLogs(
    @Query("limit") limit?: number,
    @Query("action") action?: string,
  ) {
    return this.superAdminService.getAuditLogs({ limit, action });
  }

  @Post("impersonate")
  async impersonateCompany(@Body("companyId") companyId: string) {
    return this.superAdminService.impersonateCompany(companyId);
  }
}
