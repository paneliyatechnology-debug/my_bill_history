import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { TenantContext, UserRole } from "@billing/shared-types";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { VouchersService } from "./vouchers.service";
import { CreateVoucherDto } from "./dto/create-voucher.dto";
import { ReverseVoucherDto } from "./dto/reverse-voucher.dto";

@Controller("vouchers")
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
  )
  async createVoucher(
    @Body() dto: CreateVoucherDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.vouchersService.createVoucher(dto, tenant);
  }

  @Post("receipt")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
  )
  async createReceiptVoucher(
    @Body() dto: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.vouchersService.createReceiptVoucher(dto, tenant);
  }

  @Post("expense")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
  )
  async createExpenseVoucher(
    @Body() dto: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.vouchersService.createExpenseVoucher(dto, tenant);
  }

  @Get()
  async listVouchers(
    @Query() query: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.vouchersService.listVouchers(tenant, query);
  }

  @Get(":id")
  async getVoucher(
    @Param("id") id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.vouchersService.getVoucherById(id, tenant);
  }

  @Post(":id/reverse")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
  )
  async reverseVoucher(
    @Param("id") id: string,
    @Body() dto: ReverseVoucherDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.vouchersService.reverseVoucher(id, dto, tenant);
  }

  @Patch(":id")
  updateVoucher() {
    throw new BadRequestException(
      "Posted vouchers are immutable according to double-entry accounting rules. Use the /vouchers/:id/reverse endpoint to reverse this voucher.",
    );
  }

  @Delete(":id")
  deleteVoucher() {
    throw new BadRequestException(
      "Posted vouchers cannot be deleted according to double-entry accounting rules. Use the /vouchers/:id/reverse endpoint to reverse this voucher.",
    );
  }
}
