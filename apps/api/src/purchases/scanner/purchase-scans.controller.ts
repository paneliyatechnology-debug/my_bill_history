import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { TenantContext, UserRole } from "@billing/shared-types";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { PurchaseScannerService } from "./services/purchase-scanner.service";
import {
  ConfirmPurchaseScanDto,
  ConfirmPurchaseScanSchema,
  UpdateScanDraftDto,
  UpdateScanDraftSchema,
} from "./schemas/bill-extraction.schema";

@Controller("purchases/scans")
export class PurchaseScansController {
  constructor(private readonly scannerService: PurchaseScannerService) {}

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.BRANCH_MANAGER,
  )
  async uploadBill(
    @Req() req: FastifyRequest,
    @CurrentTenant() tenant: TenantContext,
  ) {
    let fileBuffer: Buffer | null = null;
    let fileName = "bill.pdf";
    let mimeType = "application/pdf";
    let idempotencyKey: string | undefined;
    let provider: string | undefined;

    // Check if multipart form data
    if ((req as any).isMultipart && (req as any).isMultipart()) {
      const parts = (req as any).parts();
      for await (const part of parts) {
        if (part.type === "file") {
          fileBuffer = await part.toBuffer();
          fileName = part.filename;
          mimeType = part.mimetype;
        } else if (part.fieldname === "idempotencyKey") {
          idempotencyKey = part.value as string;
        } else if (part.fieldname === "provider") {
          provider = part.value as string;
        }
      }
    } else {
      // JSON payload support (for mobile camera or base64 uploads)
      const body = (req.body || {}) as any;
      if (body.fileBase64) {
        fileBuffer = Buffer.from(body.fileBase64, "base64");
        fileName = body.fileName || "bill.pdf";
        mimeType = body.mimeType || "application/pdf";
        idempotencyKey = body.idempotencyKey;
        provider = body.provider;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException(
        "No bill file provided. Please upload a PDF or image file via multipart form or base64.",
      );
    }

    return await this.scannerService.uploadAndProcessBill(
      fileBuffer,
      fileName,
      mimeType,
      tenant,
      idempotencyKey,
      provider,
    );
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.BRANCH_MANAGER,
    UserRole.AUDITOR,
  )
  async getScans(
    @Query("status") status: string,
    @Query("search") search: string,
    @Query("page") page: string,
    @Query("limit") limit: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.scannerService.getScans(
      tenant,
      status,
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.BRANCH_MANAGER,
    UserRole.AUDITOR,
  )
  async getScanById(
    @Param("id") id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.scannerService.getScanById(id, tenant);
  }

  @Get(":id/file")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.BRANCH_MANAGER,
    UserRole.AUDITOR,
  )
  async getScanFile(
    @Param("id") id: string,
    @CurrentTenant() tenant: TenantContext,
    @Res() reply: FastifyReply,
  ) {
    const file = await this.scannerService.getScanFile(id, tenant);

    reply
      .header("Content-Type", file.mimeType)
      .header("X-Content-Type-Options", "nosniff")
      .header(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.fileName)}"`,
      )
      .send(file.buffer);
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.BRANCH_MANAGER,
  )
  async updateScanDraft(
    @Param("id") id: string,
    @Body() body: UpdateScanDraftDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const validated = UpdateScanDraftSchema.parse(body);
    return await this.scannerService.updateScanDraft(id, validated, tenant);
  }

  @Post(":id/confirm")
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.BRANCH_MANAGER,
  )
  async confirmPurchaseScan(
    @Param("id") id: string,
    @Body() body: ConfirmPurchaseScanDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const validated = ConfirmPurchaseScanSchema.parse(body);
    return await this.scannerService.confirmPurchaseScan(id, validated, tenant);
  }

  @Delete(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ORG_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.BRANCH_MANAGER,
  )
  async discardScan(
    @Param("id") id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.scannerService.discardScan(id, tenant);
  }
}
