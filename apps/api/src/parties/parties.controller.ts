import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PartiesService } from "./parties.service";
import { CreatePartyDto } from "./dto/create-party.dto";
import { UpdatePartyDto, QueryPartiesDto } from "./dto/update-party.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { TenantContext, UserRole } from "@billing/shared-types";

@Controller("parties")
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Roles(UserRole.COMPANY_ADMIN, UserRole.ACCOUNTANT)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: CreatePartyDto,
  ) {
    return this.partiesService.create(ctx, dto);
  }

  @Get()
  async findAll(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: QueryPartiesDto,
  ) {
    return this.partiesService.findAll(ctx, query);
  }

  @Get(":id")
  async findOne(@CurrentTenant() ctx: TenantContext, @Param("id") id: string) {
    return this.partiesService.findOne(ctx, id);
  }

  @Roles(UserRole.COMPANY_ADMIN, UserRole.ACCOUNTANT)
  @Put(":id")
  async update(
    @CurrentTenant() ctx: TenantContext,
    @Param("id") id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.partiesService.update(ctx, id, dto);
  }

  @Roles(UserRole.COMPANY_ADMIN)
  @Patch(":id/archive")
  async archive(@CurrentTenant() ctx: TenantContext, @Param("id") id: string) {
    return this.partiesService.archive(ctx, id);
  }

  @Roles(UserRole.COMPANY_ADMIN)
  @Delete(":id")
  async delete(@CurrentTenant() ctx: TenantContext, @Param("id") id: string) {
    return this.partiesService.archive(ctx, id);
  }
}
