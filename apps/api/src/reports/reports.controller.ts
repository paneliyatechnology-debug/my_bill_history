import {
  Controller,
  Get,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FastifyReply } from "fastify";
import { TenantContext, UserRole } from "@billing/shared-types";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { ReportsService } from "./reports.service";
import { QuerySalesRegisterDto } from "./dto/query-sales-register.dto";
import {
  QueryReceiptPaymentRegisterDto,
  QueryOutstandingBalancesDto,
  QueryPartyAgingDto,
  QueryPartyLedgerDto,
  QueryGeneralLedgerDto,
  QueryFinancialStatementDto,
  QueryDaybookDto,
  QueryStockSummaryDto,
  QueryStockMovementReportDto,
  QueryGstr1ReportDto,
} from "./dto/query-reports.dto";

@Controller("reports")
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.ORG_ADMIN,
  UserRole.COMPANY_ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.AUDITOR,
  UserRole.BRANCH_MANAGER,
)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // 1. Sales Register
  @Get("sales-register")
  async getSalesRegister(
    @Query() query: QuerySalesRegisterDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getSalesRegister(query, tenant);
  }

  @Get("sales-register/export")
  async exportSalesRegister(
    @Query() query: QuerySalesRegisterDto,
    @CurrentTenant() tenant: TenantContext,
    @Res() res: FastifyReply,
  ) {
    const csv = await this.reportsService.exportSalesRegisterCsv(query, tenant);
    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header(
      "Content-Disposition",
      'attachment; filename="sales-register.csv"',
    );
    return res.send(csv);
  }

  // 2. Purchase Register (Deferred notice)
  @Get("purchase-register")
  async getPurchaseRegister(
    @CurrentTenant() tenant: TenantContext,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    return await this.reportsService.getPurchaseRegister(tenant, { fromDate, toDate });
  }

  // 3. Receipt / Payment Register
  @Get("receipt-payment-register")
  async getReceiptPaymentRegister(
    @Query() query: QueryReceiptPaymentRegisterDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getReceiptPaymentRegister(query, tenant);
  }

  // 4. Outstanding Balances & Aging
  @Get("outstanding-balances")
  async getOutstandingBalances(
    @Query() query: QueryOutstandingBalancesDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getOutstandingBalances(query, tenant);
  }

  @Get("party-aging")
  async getPartyAging(
    @Query() query: QueryPartyAgingDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getPartyAging(query, tenant);
  }

  // 5. Party Ledger (Khata)
  @Get("party-ledger")
  async getPartyLedger(
    @Query() query: QueryPartyLedgerDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getPartyLedger(query, tenant);
  }

  // 6. General Ledger (Khatavahi)
  @Get("general-ledger")
  async getGeneralLedger(
    @Query() query: QueryGeneralLedgerDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getGeneralLedger(query, tenant);
  }

  // 7. Trial Balance (Kachu Sarvaiyu)
  @Get("trial-balance")
  async getTrialBalance(
    @Query() query: QueryFinancialStatementDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getTrialBalance(query, tenant);
  }

  // 8. Profit & Loss Statement (Nafanuksan Khatun)
  @Get("profit-and-loss")
  async getProfitAndLoss(
    @Query() query: QueryFinancialStatementDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getProfitAndLoss(query, tenant);
  }

  // 9. Balance Sheet (Paku Sarvaiyu)
  @Get("balance-sheet")
  async getBalanceSheet(
    @Query() query: QueryFinancialStatementDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getBalanceSheet(query, tenant);
  }

  // 10. Day Book (Rojmel / Aavad)
  @Get("daybook")
  async getDaybook(
    @Query() query: QueryDaybookDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getDaybook(query, tenant);
  }

  // 11. Stock Summary & Movement
  @Get("stock-summary")
  async getStockSummary(
    @Query() query: QueryStockSummaryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getStockSummary(query, tenant);
  }

  @Get("stock-movement")
  async getStockMovement(
    @Query() query: QueryStockMovementReportDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getStockMovement(query, tenant);
  }

  // 12. GSTR-1 Return Preparation Summary
  @Get("gstr-1")
  async getGstr1Report(
    @Query() query: QueryGstr1ReportDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getGstr1Report(query, tenant);
  }

  @Get("gst-summary")
  async getGstSummary(
    @Query() query: QueryGstr1ReportDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getGstr1Report(query, tenant);
  }

  // 13. Cash Flow Statement
  @Get("cash-flow")
  async getCashFlow(
    @Query() query: QueryFinancialStatementDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getCashFlow(query, tenant);
  }

  // 14. GSTR-3B Monthly Return Summary
  @Get("gstr-3b")
  async getGstr3b(
    @Query() query: QueryFinancialStatementDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return await this.reportsService.getGstr3bReport(query, tenant);
  }
}
