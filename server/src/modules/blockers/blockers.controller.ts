import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BlockersService } from "./blockers.service";
import { CreateBlockerDto } from "./dto/create-blocker.dto";
import { UpdateBlockerDto } from "./dto/update-blocker.dto";
import { ResolveBlockerDto } from "./dto/resolve-blocker.dto";
import { QueryBlockerRadarDto } from "./dto/query-blocker-radar.dto";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ParseUUIDPipe } from "../../common/validators/record-id";

@ApiTags("Task Blockers & Radar (PLAN-002)")
@ApiBearerAuth("JWT-auth")
@Controller("blockers")
export class BlockersController {
  constructor(private readonly blockersService: BlockersService) {}

  @Post()
  @RequirePermissions("BLOCKERS:MANAGE")
  @ApiOperation({ summary: "Log a new blocker episode against a task" })
  async create(
    @Body() dto: CreateBlockerDto,
    @CurrentUser("id") userId: string,
  ) {
    return { data: await this.blockersService.createBlocker(dto, userId) };
  }

  @Get("radar")
  @RequirePermissions("BLOCKERS:READ")
  @ApiOperation({
    summary:
      "Query the Blocker Radar dashboard (active, critical, aging breaches)",
  })
  async getRadar(@Query() query: QueryBlockerRadarDto) {
    return { data: await this.blockersService.getBlockerRadar(query) };
  }

  @Get("task/:taskId")
  @RequirePermissions("BLOCKERS:READ")
  @ApiOperation({
    summary:
      "Get all blocker episodes for a task with non-overlapping duration summary",
  })
  async getTaskBlockers(@Param("taskId", ParseUUIDPipe) taskId: string) {
    return { data: await this.blockersService.getBlockersForTask(taskId) };
  }

  @Get(":id")
  @RequirePermissions("BLOCKERS:READ")
  @ApiOperation({ summary: "Fetch a single blocker episode" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return { data: await this.blockersService.findOne(id) };
  }

  @Patch(":id/resolve")
  @RequirePermissions("BLOCKERS:MANAGE")
  @ApiOperation({
    summary:
      "Resolve or dismiss a blocker episode and recompute task blocked status",
  })
  async resolve(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolveBlockerDto,
    @CurrentUser("id") userId: string,
  ) {
    return { data: await this.blockersService.resolveBlocker(id, dto, userId) };
  }

  @Patch(":id")
  @RequirePermissions("BLOCKERS:MANAGE")
  @ApiOperation({ summary: "Update an existing blocker episode" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlockerDto,
    @CurrentUser("id") userId: string,
  ) {
    return { data: await this.blockersService.updateBlocker(id, dto, userId) };
  }

  @Delete(":id")
  @RequirePermissions("BLOCKERS:MANAGE")
  @ApiOperation({ summary: "Delete a blocker episode" })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    return await this.blockersService.deleteBlocker(id, userId);
  }
}
