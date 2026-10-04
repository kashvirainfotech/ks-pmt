import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { DraftingController } from "./drafting.controller";
import { DraftingService } from "./drafting.service";

@Module({
  imports: [DatabaseModule],
  controllers: [DraftingController],
  providers: [DraftingService],
  exports: [DraftingService],
})
export class DraftingModule {}
