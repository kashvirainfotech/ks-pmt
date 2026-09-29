import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { BlockersService } from "./blockers.service";
import { BlockersController } from "./blockers.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [BlockersController],
  providers: [BlockersService],
  exports: [BlockersService],
})
export class BlockersModule {}
