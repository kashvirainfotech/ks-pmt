import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DependenciesService } from "./dependencies.service";
import { CreateDependencyDto } from "./dto/create-dependency.dto";
import { QueryDependencyDto } from "./dto/query-dependency.dto";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ParseUUIDPipe } from "../../common/validators/record-id";

@ApiTags("Task Dependencies & Relationships (PLAN-002)")
@ApiBearerAuth("JWT-auth")
@Controller("dependencies")
export class DependenciesController {
  constructor(private readonly dependenciesService: DependenciesService) {}

  @Post()
  @RequirePermissions("DEPENDENCIES:MANAGE")
  @ApiOperation({
    summary:
      "Create a directed dependency or relationship link (with DAG cycle validation)",
  })
  async create(
    @Body() dto: CreateDependencyDto,
    @CurrentUser("id") userId: string,
  ) {
    return { data: await this.dependenciesService.createDependency(dto, userId) };
  }

  @Get()
  @RequirePermissions("DEPENDENCIES:READ")
  @ApiOperation({ summary: "Query dependencies by task or link type" })
  async findAll(@Query() query: QueryDependencyDto) {
    return { data: await this.dependenciesService.findAll(query) };
  }

  @Get("task/:taskId")
  @RequirePermissions("DEPENDENCIES:READ")
  @ApiOperation({
    summary:
      "Get all outgoing and inverse incoming dependency links for a given task",
  })
  async findByTaskId(@Param("taskId", ParseUUIDPipe) taskId: string) {
    return { data: await this.dependenciesService.findByTaskId(taskId) };
  }

  @Get("map/:taskId")
  @RequirePermissions("DEPENDENCIES:READ")
  @ApiOperation({
    summary:
      "Get dependency map with upstream prerequisites, downstream impact, and anomaly flags",
  })
  async getDependencyMap(@Param("taskId", ParseUUIDPipe) taskId: string) {
    return { data: await this.dependenciesService.getDependencyMap(taskId) };
  }

  @Delete(":id")
  @RequirePermissions("DEPENDENCIES:MANAGE")
  @ApiOperation({
    summary: "Remove a dependency link and re-evaluate target blocked state",
  })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    return await this.dependenciesService.removeDependency(id, userId);
  }
}
