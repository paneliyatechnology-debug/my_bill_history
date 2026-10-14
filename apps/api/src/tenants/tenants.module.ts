import { Module } from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { TenantsController } from "./tenants.controller";
import { WarehousesController } from "./warehouses.controller";

@Module({
  controllers: [TenantsController, WarehousesController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
