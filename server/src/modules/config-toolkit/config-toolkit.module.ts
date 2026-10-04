import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { ConfigToolkitController } from "./config-toolkit.controller";
import { ConfigToolkitService } from "./config-toolkit.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ConfigToolkitController],
  providers: [ConfigToolkitService],
  exports: [ConfigToolkitService],
})
export class ConfigToolkitModule {}
