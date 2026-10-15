import { Module } from "@nestjs/common";
import { SuperAdminController } from "./super-admin.controller";
import { SuperAdminService } from "./super-admin.service";
import { DatabaseModule } from "../database/database.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
