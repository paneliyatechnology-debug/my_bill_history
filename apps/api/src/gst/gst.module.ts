import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { GstController } from "./gst.controller";
import { GstPortalService } from "./gst-portal.service";
import { GstDocumentsService } from "./gst-documents.service";
import { Gstr2bService } from "./gstr2b.service";

@Module({
  imports: [DatabaseModule],
  controllers: [GstController],
  providers: [Gstr2bService, GstPortalService, GstDocumentsService],
  exports: [Gstr2bService, GstPortalService, GstDocumentsService],
})
export class GstModule {}
