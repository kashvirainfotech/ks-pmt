import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { DependenciesService } from "./dependencies.service";
import { DependenciesController } from "./dependencies.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [DependenciesController],
  providers: [DependenciesService],
  exports: [DependenciesService],
})
export class DependenciesModule {}
