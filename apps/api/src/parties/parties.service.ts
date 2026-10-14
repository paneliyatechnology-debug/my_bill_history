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
  PartyType,
  GstRegistrationType,
} from "@billing/shared-types";
import { CreatePartyDto } from "./dto/create-party.dto";
import { UpdatePartyDto, QueryPartiesDto } from "./dto/update-party.dto";
import { validatePartyGstin } from "../common/validators/gstin.validator";

@Injectable()
export class PartiesService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(ctx: TenantContext, dto: CreatePartyDto) {
    const partyType = dto.type || (dto as any).partyType || PartyType.CUSTOMER;
    const isSupplier = partyType === PartyType.SUPPLIER;

    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Party business or trade name is required.",
        messageGujarati: "પાર્ટીનું નામ જરૂરી છે.",
      });
    }

    const rawPhone = dto.phone ? dto.phone.trim() : "";
    if (!isSupplier && !rawPhone) {
      throw new BadRequestException({
        statusCode: 400,
        message: "Primary contact phone number is required.",
        messageGujarati: "પ્રાથમિક ફોન નંબર જરૂરી છે.",
      });
    }

    const gstin = dto.gstin?.trim().toUpperCase() || null;
    let stateCode = dto.stateCode?.trim();
    if (!stateCode) {
      if (gstin && gstin.length >= 2) {
        stateCode = gstin.substring(0, 2);
      } else if (isSupplier) {
        stateCode = "24"; // Default state code (Gujarat) for unregistered suppliers, or 96 for overseas
      } else {
        throw new BadRequestException({
          statusCode: 400,
          message: "Party state code is required.",
          messageGujarati: "પાર્ટીનો રાજ્ય કોડ જરૂરી છે.",
        });
      }
    }

    let billingAddress = dto.billingAddress;
    if (!isSupplier) {
      if (
        !billingAddress ||
        !billingAddress.city ||
        !billingAddress.pincode
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: "Billing address with city and pincode is required.",
          messageGujarati: "શહેર અને પિનકોડ સાથેનું બિલિંગ સરનામું જરૂરી છે.",
        });
      }
    } else {
      if (!billingAddress) {
        billingAddress = {
          line1: "",
          city: "",
          pincode: "",
        };
      }
    }

    // Validate GSTIN format, state code alignment, and Modulo 36 checksum
    const gstinValidation = validatePartyGstin(gstin, stateCode);
    if (!gstinValidation.isValid) {
      throw new BadRequestException({
        statusCode: 400,
        error: "INVALID_GSTIN",
        message: gstinValidation.error,
        messageGujarati: gstinValidation.errorGujarati,
      });
    }

    const derivedPan = gstin
      ? gstinValidation.pan
      : dto.pan?.trim().toUpperCase() || null;
    const gstType = gstin
      ? dto.gstType || GstRegistrationType.REGULAR
      : dto.gstType || GstRegistrationType.UNREGISTERED;

    const name = dto.name.trim();
    const phone = rawPhone;

    return this.prisma.executeInTenantContext(ctx, async (tx) => {
      // 1. Prevent duplicate active party with same GSTIN within company
      if (gstin) {
        const existingGstin = await tx.party.findFirst({
          where: {
            companyId: ctx.companyId,
            gstin,
            isActive: true,
          },
        });

        if (existingGstin) {
          throw new ConflictException({
            statusCode: 409,
            error: "DUPLICATE_GSTIN",
            message: `A party with GSTIN '${gstin}' already exists in this company ('${existingGstin.name}').`,
            messageGujarati: `આ કંપનીમાં GSTIN '${gstin}' ધરાવતી પાર્ટી પહેલેથી જ હાજર છે.`,
          });
        }
      }

      // 2. Prevent duplicate active party with identical phone or identical name within company
      const existingDuplicate = await tx.party.findFirst({
        where: {
          companyId: ctx.companyId,
          isActive: true,
          OR: [
            ...(phone ? [{ phone, name: { equals: name, mode: "insensitive" as const } }] : []),
            { type: partyType, name: { equals: name, mode: "insensitive" as const } },
          ],
        },
      });

      if (existingDuplicate) {
        throw new ConflictException({
          statusCode: 409,
          error: "DUPLICATE_PARTY",
          message: phone
            ? `A party named '${name}' with phone '${phone}' already exists in this company.`
            : `A party named '${name}' already exists in this company.`,
          messageGujarati: phone
            ? `આ કંપનીમાં '${phone}' ફોન નંબર સાથે '${name}' નામની પાર્ટી પહેલેથી જ હાજર છે.`
            : `આ કંપનીમાં '${name}' નામની પાર્ટી પહેલેથી જ હાજર છે.`,
        });
      }

      // 3. Create Party
      const party = await tx.party.create({
        data: {
          organizationId: ctx.organizationId,
          companyId: ctx.companyId,
          type: partyType,
          name,
          nameGujarati: dto.nameGujarati?.trim() || null,
          contactPerson: dto.contactPerson?.trim() || null,
          phone,
          email: dto.email?.trim() || null,
          gstin,
          pan: derivedPan,
          gstType,
          stateCode,
          billingAddress: billingAddress as any,
          shippingAddress: dto.shippingAddress
            ? (dto.shippingAddress as any)
            : null,
          creditLimit: dto.creditLimit ?? 0.0,
          creditDays: dto.creditDays ?? 0,
          interestRate: dto.interestRate ?? 0.0,
          defaultDiscount: dto.defaultDiscount ?? 0.0,
          bankDetails: dto.bankDetails ? (dto.bankDetails as any) : null,
          isActive: true,
        },
      });

      // 4. Audit Log
      if (ctx.userId) {
        await this.audit.record({
          organizationId: ctx.organizationId,
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "PARTY_CREATE",
          entityName: "Party",
          entityId: party.id,
          newState: party,
        });
      }

      return party;
    });
  }

  async findAll(ctx: TenantContext, query: QueryPartiesDto) {
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

      if (query.stateCode) {
        where.stateCode = query.stateCode;
      }

      if (query.isActive !== undefined && query.isActive !== "") {
        where.isActive = query.isActive === true || query.isActive === "true";
      }

      if (query.search && query.search.trim()) {
        const search = query.search.trim();
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { nameGujarati: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { gstin: { contains: search, mode: "insensitive" } },
          { contactPerson: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        tx.party.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take: limit,
        }),
        tx.party.count({ where }),
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
      const party = await tx.party.findFirst({
        where: { id, companyId: ctx.companyId },
      });

      if (!party) {
        throw new NotFoundException({
          statusCode: 404,
          message: `Party with ID '${id}' not found in the active company.`,
          messageGujarati: `સક્રિય કંપનીમાં આઈડી '${id}' વાળી પાર્ટી મળી નથી.`,
        });
      }

      return party;
    });
  }

  async update(ctx: TenantContext, id: string, dto: UpdatePartyDto) {
    return this.prisma.executeInTenantContext(ctx, async (tx) => {
      const existing = await tx.party.findFirst({
        where: { id, companyId: ctx.companyId },
      });

      if (!existing) {
        throw new NotFoundException({
          statusCode: 404,
          message: `Party with ID '${id}' not found.`,
          messageGujarati: `પાર્ટી મળેલ નથી.`,
        });
      }

      const updatedStateCode = dto.stateCode?.trim() || existing.stateCode;
      let updatedGstin = existing.gstin;

      if (dto.gstin !== undefined) {
        updatedGstin = dto.gstin ? dto.gstin.trim().toUpperCase() : null;
      }

      // If GSTIN or stateCode changed, validate format and checksum
      if (
        updatedGstin &&
        (dto.gstin !== undefined || dto.stateCode !== undefined)
      ) {
        const val = validatePartyGstin(updatedGstin, updatedStateCode);
        if (!val.isValid) {
          throw new BadRequestException({
            statusCode: 400,
            error: "INVALID_GSTIN",
            message: val.error,
            messageGujarati: val.errorGujarati,
          });
        }

        // Check duplicate GSTIN in other active parties of same company
        const duplicateGstin = await tx.party.findFirst({
          where: {
            companyId: ctx.companyId,
            gstin: updatedGstin,
            id: { not: id },
            isActive: true,
          },
        });

        if (duplicateGstin) {
          throw new ConflictException({
            statusCode: 409,
            error: "DUPLICATE_GSTIN",
            message: `Another party in this company already uses GSTIN '${updatedGstin}'.`,
            messageGujarati: `આ કંપનીમાં અન્ય પાર્ટી પહેલેથી જ આ GSTIN ધરાવે છે.`,
          });
        }
      }

      const updated = await tx.party.update({
        where: { id },
        data: {
          type: dto.type ?? existing.type,
          name: dto.name ? dto.name.trim() : existing.name,
          nameGujarati:
            dto.nameGujarati !== undefined
              ? dto.nameGujarati?.trim() || null
              : existing.nameGujarati,
          contactPerson:
            dto.contactPerson !== undefined
              ? dto.contactPerson?.trim() || null
              : existing.contactPerson,
          phone: dto.phone ? dto.phone.trim() : existing.phone,
          email:
            dto.email !== undefined
              ? dto.email?.trim() || null
              : existing.email,
          gstin: updatedGstin,
          pan: updatedGstin
            ? updatedGstin.substring(2, 12)
            : dto.pan !== undefined
              ? dto.pan?.trim().toUpperCase() || null
              : existing.pan,
          gstType:
            dto.gstType ??
            (updatedGstin ? GstRegistrationType.REGULAR : existing.gstType),
          stateCode: updatedStateCode,
          billingAddress: dto.billingAddress
            ? (dto.billingAddress as any)
            : existing.billingAddress,
          shippingAddress:
            dto.shippingAddress !== undefined
              ? (dto.shippingAddress as any)
              : existing.shippingAddress,
          creditLimit:
            dto.creditLimit !== undefined
              ? dto.creditLimit
              : existing.creditLimit,
          creditDays:
            dto.creditDays !== undefined ? dto.creditDays : existing.creditDays,
          interestRate:
            dto.interestRate !== undefined
              ? dto.interestRate
              : existing.interestRate,
          defaultDiscount:
            dto.defaultDiscount !== undefined
              ? dto.defaultDiscount
              : existing.defaultDiscount,
          bankDetails:
            dto.bankDetails !== undefined
              ? (dto.bankDetails as any)
              : existing.bankDetails,
          isActive:
            dto.isActive !== undefined ? dto.isActive : existing.isActive,
        },
      });

      if (ctx.userId) {
        await this.audit.record({
          organizationId: ctx.organizationId,
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "PARTY_UPDATE",
          entityName: "Party",
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
      const existing = await tx.party.findFirst({
        where: { id, companyId: ctx.companyId },
      });

      if (!existing) {
        throw new NotFoundException({
          statusCode: 404,
          message: `Party with ID '${id}' not found.`,
          messageGujarati: `પાર્ટી મળેલ નથી.`,
        });
      }

      const archived = await tx.party.update({
        where: { id },
        data: { isActive: false },
      });

      if (ctx.userId) {
        await this.audit.record({
          organizationId: ctx.organizationId,
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "PARTY_ARCHIVE",
          entityName: "Party",
          entityId: id,
          previousState: existing,
          newState: archived,
        });
      }

      return {
        success: true,
        message: `Party '${existing.name}' archived successfully.`,
        messageGujarati: `પાર્ટી '${existing.name}' સફળતાપૂર્વક આર્કાઇવ કરવામાં આવી છે.`,
        party: archived,
      };
    });
  }
}
