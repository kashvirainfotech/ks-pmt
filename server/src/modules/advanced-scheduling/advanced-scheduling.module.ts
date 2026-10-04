import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AdvancedSchedulingController } from "./advanced-scheduling.controller";
import { AdvancedSchedulingService } from "./advanced-scheduling.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdvancedSchedulingController],
  providers: [AdvancedSchedulingService],
  exports: [AdvancedSchedulingService],
})
export class AdvancedSchedulingModule {}
