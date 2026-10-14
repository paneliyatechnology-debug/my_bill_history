import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { TenantContext, UserRole } from "@billing/shared-types";
import { DatabaseService } from "../../database/database.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

export const TENANT_CONTEXT_KEY = "TENANT_CONTEXT";

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: DatabaseService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    // If public endpoint without credentials, bypass tenant context resolution
    if (isPublic && !request.headers.authorization) {
      request[TENANT_CONTEXT_KEY] = {
        organizationId: "",
        companyId: "",
        isSystemBypass: true,
      };
      return next.handle();
    }

    const user = request.user;
    if (!user || !user.organizationId) {
      // If endpoint is not public but user is missing, JwtAuthGuard will handle it.
      // If we reach here, establish safe empty context
      request[TENANT_CONTEXT_KEY] = {
        organizationId: "",
        companyId: "",
        isSystemBypass: false,
      };
      return next.handle();
    }

    const rawOrgHeader = request.headers["x-organization-id"] as
      string | undefined;
    const rawCompanyHeader = request.headers["x-company-id"] as
      string | undefined;
    const rawBranchHeader = request.headers["x-branch-id"] as
      string | undefined;
    const rawFyHeader = request.headers["x-financial-year-id"] as
      string | undefined;

    // 1. Zero Trust: Organization Check
    if (
      rawOrgHeader &&
      rawOrgHeader !== user.organizationId &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "FORBIDDEN_TENANT_ACCESS",
        message:
          "Forged or cross-tenant organization access detected. Access denied.",
        messageGujarati:
          "અનધિકૃત સંસ્થા ઍક્સેસ પ્રયાસ. પ્રવેશ નકારવામાં આવ્યો.",
      });
    }

    const verifiedOrgId = user.organizationId;

    // 2. Zero Trust: Company Check (Derived from authenticated user membership)
    let verifiedCompanyId: string;
    if (rawCompanyHeader) {
      const company = await this.prisma.company.findFirst({
        where: { id: rawCompanyHeader, organizationId: verifiedOrgId },
        select: { id: true },
      });

      if (!company) {
        throw new ForbiddenException({
          statusCode: 403,
          error: "FORBIDDEN_COMPANY_ACCESS",
          message: "Requested company does not belong to your organization.",
          messageGujarati: "વિનંતી કરેલ કંપની તમારી સંસ્થા સાથે જોડાયેલ નથી.",
        });
      }
      verifiedCompanyId = company.id;
    } else {
      const defaultCompany = await this.prisma.company.findFirst({
        where: { organizationId: verifiedOrgId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (!defaultCompany) {
        throw new ForbiddenException({
          statusCode: 403,
          error: "NO_COMPANY_FOUND",
          message: "No registered company found under your organization.",
          messageGujarati: "તમારી સંસ્થા હેઠળ કોઈ રજિસ્ટર્ડ કંપની મળી નથી.",
        });
      }
      verifiedCompanyId = defaultCompany.id;
    }

    // 3. Zero Trust: Branch Authorization Check
    let verifiedBranchId: string | undefined;
    if (rawBranchHeader) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: rawBranchHeader, companyId: verifiedCompanyId },
        select: { id: true },
      });

      if (!branch) {
        throw new ForbiddenException({
          statusCode: 403,
          error: "INVALID_BRANCH",
          message: "Requested branch does not exist within the active company.",
          messageGujarati: "વિનંતી કરેલ શાખા સક્રિય કંપનીમાં અસ્તિત્વમાં નથી.",
        });
      }

      const effectiveUserId = user.id || user.userId || user.sub;

      // If user has branch-constrained role (CASHIER, BRANCH_MANAGER, SALESMAN), verify assignment
      const branchConstrainedRoles = [
        UserRole.CASHIER,
        UserRole.BRANCH_MANAGER,
        UserRole.SALESMAN,
      ];
      if (branchConstrainedRoles.includes(user.role as UserRole)) {
        const assignment = await this.prisma.userBranchAssignment.findUnique({
          where: {
            userId_branchId: {
              userId: effectiveUserId,
              branchId: rawBranchHeader,
            },
          },
        });

        if (!assignment) {
          throw new ForbiddenException({
            statusCode: 403,
            error: "FORBIDDEN_BRANCH_ACCESS",
            message: `User is not assigned or authorized to operate branch '${rawBranchHeader}'.`,
            messageGujarati: "વપરાશકર્તા આ શાખા માટે અધિકૃત નથી.",
          });
        }
      }
      verifiedBranchId = branch.id;
    } else {
      // Find user's default branch assignment or company's main branch
      const effectiveUserId = user.id || user.userId || user.sub;
      const userAssignment = await this.prisma.userBranchAssignment.findFirst({
        where: { userId: effectiveUserId, isDefault: true },
        select: { branchId: true },
      });

      if (userAssignment) {
        verifiedBranchId = userAssignment.branchId;
      } else {
        const mainBranch = await this.prisma.branch.findFirst({
          where: { companyId: verifiedCompanyId, isMainBranch: true },
          select: { id: true },
        });
        verifiedBranchId = mainBranch?.id;
      }
    }

    // 4. Zero Trust: Financial Year Check
    let verifiedFyId: string | undefined;
    if (rawFyHeader) {
      const fy = await this.prisma.financialYear.findFirst({
        where: { id: rawFyHeader, companyId: verifiedCompanyId },
        select: { id: true },
      });

      if (!fy) {
        throw new ForbiddenException({
          statusCode: 403,
          error: "INVALID_FINANCIAL_YEAR",
          message:
            "Requested financial year does not belong to the active company.",
          messageGujarati:
            "વિનંતી કરેલ નાણાકીય વર્ષ સક્રિય કંપની સાથે જોડાયેલ નથી.",
        });
      }
      verifiedFyId = fy.id;
    } else {
      const currentFy = await this.prisma.financialYear.findFirst({
        where: { companyId: verifiedCompanyId, isCurrent: true },
        select: { id: true },
      });
      verifiedFyId = currentFy?.id;
    }

    // Bind fully validated and verified context to request
    const tenantContext: TenantContext = {
      organizationId: verifiedOrgId,
      companyId: verifiedCompanyId,
      branchId: verifiedBranchId,
      financialYearId: verifiedFyId,
      userId: user.id || user.userId || user.sub,
      isSystemBypass: false,
    };

    request[TENANT_CONTEXT_KEY] = tenantContext;

    return next.handle();
  }
}
