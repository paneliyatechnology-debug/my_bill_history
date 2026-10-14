import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuditService } from "../audit/audit.service";
import {
  TenantContext,
  ItemType,
  ValuationMethod,
} from "@billing/shared-types";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto, QueryItemsDto } from "./dto/update-item.dto";

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(ctx: TenantContext, dto: CreateItemDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Item name is required.",
        messageGujarati: "આઇટમનું નામ જરૂરી છે.",
      });
    }

    if (!dto.hsnCode || !dto.hsnCode.trim()) {
      throw new BadRequestException({
        statusCode: 400,
        message: "HSN/SAC code is required for GST compliance.",
        messageGujarati: "GST પાલન માટે HSN/SAC કોડ જરૂરી છે.",
      });
    }

    if (!dto.primaryUomId) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Primary Unit of Measure (UOM) is required.",
        messageGujarati: "પ્રાથમિક માપન એકમ (UOM) જરૂરી છે.",
      });
    }

    if (
      dto.taxRate === undefined ||
      dto.taxRate === null ||
      Number(dto.taxRate) < 0
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Valid GST tax rate is required.",
        messageGujarati: "માન્ય GST કર દર જરૂરી છે.",
      });
    }

    const type = dto.type || ItemType.PRODUCT;
    const name = dto.name.trim();
    const hsnCode = dto.hsnCode.trim();
    const sku = dto.sku?.trim() || null;
    const barcode = dto.barcode?.trim() || null;

    // Non-stock / Service item rule
    let trackBatches = Boolean(dto.trackBatches);
    let trackSerialNo = Boolean(dto.trackSerialNo);
    if (type === ItemType.SERVICE) {
      trackBatches = false;
      trackSerialNo = false;
    }

    const valuationMethod = dto.valuationMethod || ValuationMethod.FIFO;

    return this.prisma.executeInTenantContext(ctx, async (tx) => {
      // 1. Verify primary UOM belongs to company
      const primaryUom = await tx.unitOfMeasure.findFirst({
        where: { id: dto.primaryUomId, companyId: ctx.companyId },
      });

      if (!primaryUom) {
        throw new BadRequestException({
          statusCode: 400,
          message: `Primary Unit of Measure with ID '${dto.primaryUomId}' does not exist in this company.`,
          messageGujarati: "પસંદ કરેલ પ્રાથમિક એકમ આ કંપનીમાં અસ્તિત્વમાં નથી.",
        });
      }

      // 2. Verify secondary UOM and conversion factor if provided
      if (dto.secondaryUomId) {
        const secondaryUom = await tx.unitOfMeasure.findFirst({
          where: { id: dto.secondaryUomId, companyId: ctx.companyId },
        });

        if (!secondaryUom) {
          throw new BadRequestException({
            statusCode: 400,
            message: `Secondary Unit of Measure with ID '${dto.secondaryUomId}' does not exist in this company.`,
            messageGujarati: "પસંદ કરેલ ગૌણ એકમ આ કંપનીમાં અસ્તિત્વમાં નથી.",
          });
        }

        if (!dto.conversionFactor || Number(dto.conversionFactor) <= 0) {
          throw new BadRequestException({
            statusCode: 400,
            message:
              "Conversion factor must be greater than 0 when secondary UOM is defined.",
            messageGujarati:
              "ગૌણ એકમ માટે કન્વર્ઝન ફેક્ટર ૦ થી મોટો હોવો જોઈએ.",
          });
        }
      }

      // 3. Verify category if provided
      if (dto.categoryId) {
        const category = await tx.itemCategory.findFirst({
          where: { id: dto.categoryId, companyId: ctx.companyId },
        });

        if (!category) {
          throw new BadRequestException({
            statusCode: 400,
            message: `Item category with ID '${dto.categoryId}' does not exist in this company.`,
            messageGujarati: "પસંદ કરેલ કેટેગરી આ કંપનીમાં અસ્તિત્વમાં નથી.",
          });
        }
      }

      // 4. Duplicate checks within company
      if (sku) {
        const existingSku = await tx.item.findFirst({
          where: { companyId: ctx.companyId, sku },
        });

        if (existingSku) {
          throw new ConflictException({
            statusCode: 409,
            error: "DUPLICATE_SKU",
            message: `An item with SKU '${sku}' already exists in this company ('${existingSku.name}').`,
            messageGujarati: `SKU '${sku}' વાળી આઇટમ પહેલેથી જ હાજર છે.`,
          });
        }
      }

      if (barcode) {
        const existingBarcode = await tx.item.findFirst({
          where: { companyId: ctx.companyId, barcode },
        });

        if (existingBarcode) {
          throw new ConflictException({
            statusCode: 409,
            error: "DUPLICATE_BARCODE",
            message: `An item with barcode '${barcode}' already exists in this company ('${existingBarcode.name}').`,
            messageGujarati: `બારકોડ '${barcode}' વાળી આઇટમ પહેલેથી જ હાજર છે.`,
          });
        }
      }

      let hsnMasterId = dto.hsnMasterId || null;
      if (!hsnMasterId && hsnCode) {
        const foundHsn = await tx.hsnMaster.findFirst({
          where: {
            code: hsnCode,
            isActive: true,
            OR: [{ companyId: ctx.companyId }, { companyId: null }],
          },
        });
        if (foundHsn) {
          hsnMasterId = foundHsn.id;
        }
      }

      // 5. Create Item
      const item = await tx.item.create({
        data: {
          organizationId: ctx.organizationId,
          companyId: ctx.companyId,
          categoryId: dto.categoryId || null,
          hsnMasterId,
          type,
          name,
          nameGujarati: dto.nameGujarati?.trim() || null,
          sku,
          barcode,
          hsnCode,
          primaryUomId: dto.primaryUomId,
          secondaryUomId: dto.secondaryUomId || null,
          conversionFactor: dto.conversionFactor ?? null,
          taxRate: dto.taxRate,
          cessRate: dto.cessRate ?? 0.0,
          cessPerUnit: dto.cessPerUnit ?? 0.0,
          purchaseRate: dto.purchaseRate ?? 0.0,
          retailPrice: dto.retailPrice,
          wholesalePrice: dto.wholesalePrice ?? 0.0,
          mrp: dto.mrp ?? null,
          minStockLevel: dto.minStockLevel ?? 0.0,
          reorderQuantity: dto.reorderQuantity ?? 0.0,
          trackBatches,
          trackSerialNo,
          valuationMethod,
          isActive: true,
        },
        include: {
          primaryUom: true,
          secondaryUom: true,
          category: true,
          hsnMaster: true,
        },
      });

      // 6. Audit Log
      if (ctx.userId) {
        await this.audit.record({
          organizationId: ctx.organizationId,
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "ITEM_CREATE",
          entityName: "Item",
          entityId: item.id,
          newState: item,
        });
      }

      return item;
    });
  }

  async lookup(ctx: TenantContext, code: string) {
    if (!code || !code.trim()) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Search code (barcode or SKU) is required for lookup.",
        messageGujarati: "શોધવા માટે બારકોડ અથવા SKU કોડ જરૂરી છે.",
      });
    }

    const cleanCode = code.trim();

    return this.prisma.executeInTenantContext(ctx, async (tx) => {
      const item = await tx.item.findFirst({
        where: {
          companyId: ctx.companyId,
          isActive: true,
          OR: [{ barcode: cleanCode }, { sku: cleanCode }],
        },
        include: {
          primaryUom: true,
          secondaryUom: true,
          category: true,
          batches: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (!item) {
        throw new NotFoundException({
          statusCode: 404,
          error: "ITEM_NOT_FOUND",
          message: `No active item found matching code '${cleanCode}'.`,
          messageGujarati: `કોડ '${cleanCode}' સાથે મેળ ખાતી કોઈ સક્રિય આઇટમ મળી નથી.`,
        });
      }

      return item;
    });
  }

  async findAll(ctx: TenantContext, query: QueryItemsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    return this.prisma.executeInTenantContext(ctx, async (tx) => {
      const where: any = {
        companyId: ctx.companyId,
      };

      if (query.type) {
        where.type = query.type;
      }

      if (query.categoryId) {
        where.categoryId = query.categoryId;
      }

      if (query.isActive !== undefined && query.isActive !== "") {
        where.isActive = query.isActive === true || query.isActive === "true";
      }

      if (query.search && query.search.trim()) {
        const search = query.search.trim();
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { nameGujarati: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { barcode: { contains: search, mode: "insensitive" } },
          { hsnCode: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        tx.item.findMany({
          where,
          include: {
            primaryUom: true,
            secondaryUom: true,
            category: true,
            hsnMaster: true,
          },
          orderBy: { name: "asc" },
          skip,
          take: limit,
        }),
        tx.item.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  async findOne(ctx: TenantContext, id: string) {
    return this.prisma.executeInTenantContext(ctx, async (tx) => {
      const item = await tx.item.findFirst({
        where: { id, companyId: ctx.companyId },
        include: {
          primaryUom: true,
          secondaryUom: true,
          category: true,
          batches: true,
          hsnMaster: true,
        },
      });

      if (!item) {
        throw new NotFoundException({
          statusCode: 404,
          message: `Item with ID '${id}' not found in the active company.`,
          messageGujarati: `સક્રિય કંપનીમાં આઈડી '${id}' વાળી આઇટમ મળી નથી.`,
        });
      }

      return item;
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdateItemDto) {
    return this.prisma.executeInTenantContext(ctx, async (tx) => {
      const existing = await tx.item.findFirst({
        where: { id, companyId: ctx.companyId },
      });

      if (!existing) {
        throw new NotFoundException({
          statusCode: 404,
          message: `Item with ID '${id}' not found.`,
          messageGujarati: `આઇટમ મળી નથી.`,
        });
      }

      // Check duplicate SKU if changed
      if (dto.sku !== undefined && dto.sku !== existing.sku) {
        const sku = dto.sku ? dto.sku.trim() : null;
        if (sku) {
          const duplicate = await tx.item.findFirst({
            where: { companyId: ctx.companyId, sku, id: { not: id } },
          });
          if (duplicate) {
            throw new ConflictException({
              statusCode: 409,
              error: "DUPLICATE_SKU",
              message: `Another item with SKU '${sku}' already exists in this company.`,
              messageGujarati: `SKU '${sku}' વાળી અન્ય આઇટમ પહેલેથી જ હાજર છે.`,
            });
          }
        }
      }

      // Check duplicate barcode if changed
      if (dto.barcode !== undefined && dto.barcode !== existing.barcode) {
        const barcode = dto.barcode ? dto.barcode.trim() : null;
        if (barcode) {
          const duplicate = await tx.item.findFirst({
            where: { companyId: ctx.companyId, barcode, id: { not: id } },
          });
          if (duplicate) {
            throw new ConflictException({
              statusCode: 409,
              error: "DUPLICATE_BARCODE",
              message: `Another item with barcode '${barcode}' already exists in this company.`,
              messageGujarati: `બારકોડ '${barcode}' વાળી અન્ય આઇટમ પહેલેથી જ હાજર છે.`,
            });
          }
        }
      }

      const type = dto.type ?? existing.type;
      let trackBatches =
        dto.trackBatches !== undefined
          ? dto.trackBatches
          : existing.trackBatches;
      let trackSerialNo =
        dto.trackSerialNo !== undefined
          ? dto.trackSerialNo
          : existing.trackSerialNo;
      if (type === ItemType.SERVICE) {
        trackBatches = false;
        trackSerialNo = false;
      }

      let nextHsnCode = dto.hsnCode ? dto.hsnCode.trim() : existing.hsnCode;
      let nextHsnMasterId = dto.hsnMasterId !== undefined ? dto.hsnMasterId : existing.hsnMasterId;
      if (dto.hsnCode && dto.hsnMasterId === undefined) {
        const foundHsn = await tx.hsnMaster.findFirst({
          where: {
            code: nextHsnCode,
            isActive: true,
            OR: [{ companyId: ctx.companyId }, { companyId: null }],
          },
        });
        nextHsnMasterId = foundHsn ? foundHsn.id : null;
      }

      const updated = await tx.item.update({
        where: { id },
        data: {
          type,
          name: dto.name ? dto.name.trim() : existing.name,
          nameGujarati:
            dto.nameGujarati !== undefined
              ? dto.nameGujarati?.trim() || null
              : existing.nameGujarati,
          sku:
            dto.sku !== undefined
              ? dto.sku
                ? dto.sku.trim()
                : null
              : existing.sku,
          barcode:
            dto.barcode !== undefined
              ? dto.barcode
                ? dto.barcode.trim()
                : null
              : existing.barcode,
          hsnCode: nextHsnCode,
          hsnMasterId: nextHsnMasterId,
          categoryId:
            dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
          primaryUomId: dto.primaryUomId ?? existing.primaryUomId,
          secondaryUomId:
            dto.secondaryUomId !== undefined
              ? dto.secondaryUomId
              : existing.secondaryUomId,
          conversionFactor:
            dto.conversionFactor !== undefined
              ? dto.conversionFactor
              : existing.conversionFactor,
          taxRate: dto.taxRate !== undefined ? dto.taxRate : existing.taxRate,
          cessRate:
            dto.cessRate !== undefined ? dto.cessRate : existing.cessRate,
          cessPerUnit:
            dto.cessPerUnit !== undefined
              ? dto.cessPerUnit
              : existing.cessPerUnit,
          purchaseRate:
            dto.purchaseRate !== undefined
              ? dto.purchaseRate
              : existing.purchaseRate,
          retailPrice:
            dto.retailPrice !== undefined
              ? dto.retailPrice
              : existing.retailPrice,
          wholesalePrice:
            dto.wholesalePrice !== undefined
              ? dto.wholesalePrice
              : existing.wholesalePrice,
          mrp: dto.mrp !== undefined ? dto.mrp : existing.mrp,
          minStockLevel:
            dto.minStockLevel !== undefined
              ? dto.minStockLevel
              : existing.minStockLevel,
          reorderQuantity:
            dto.reorderQuantity !== undefined
              ? dto.reorderQuantity
              : existing.reorderQuantity,
          trackBatches,
          trackSerialNo,
          valuationMethod: dto.valuationMethod ?? existing.valuationMethod,
          isActive:
            dto.isActive !== undefined ? dto.isActive : existing.isActive,
        },
        include: {
          primaryUom: true,
          secondaryUom: true,
          category: true,
          hsnMaster: true,
        },
      });

      if (ctx.userId) {
        await this.audit.record({
          organizationId: ctx.organizationId,
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "ITEM_UPDATE",
          entityName: "Item",
          entityId: id,
          previousState: existing,
          newState: updated,
        });
      }

      return updated;
    });
  }

  async archive(ctx: TenantContext, id: string) {
    return this.prisma.executeInTenantContext(ctx, async (tx) => {
      const existing = await tx.item.findFirst({
        where: { id, companyId: ctx.companyId },
      });

      if (!existing) {
        throw new NotFoundException({
          statusCode: 404,
          message: `Item with ID '${id}' not found.`,
          messageGujarati: `આઇટમ મળી નથી.`,
        });
      }

      const archived = await tx.item.update({
        where: { id },
        data: { isActive: false },
      });

      if (ctx.userId) {
        await this.audit.record({
          organizationId: ctx.organizationId,
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "ITEM_ARCHIVE",
          entityName: "Item",
          entityId: id,
          previousState: existing,
          newState: archived,
        });
      }

      return {
        success: true,
        message: `Item '${existing.name}' archived successfully.`,
        messageGujarati: `આઇટમ '${existing.name}' સફળતાપૂર્વક આર્કાઇવ કરવામાં આવી છે.`,
        item: archived,
      };
    });
  }
}
