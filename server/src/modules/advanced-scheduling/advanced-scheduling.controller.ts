import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { DynamicRbacGuard } from "../rbac/rbac.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { AdvancedSchedulingService } from "./advanced-scheduling.service";
import { CreateScenarioDto } from "./dto/create-scenario.dto";
import { ScenarioQueryDto } from "./dto/scenario-query.dto";
import { UpdateScenarioOverrideDto } from "./dto/update-scenario-override.dto";
import { UpsertHealthConfigDto } from "./dto/health-config.dto";
import { RecordHealthOverrideDto } from "./dto/health-override.dto";

@ApiTags("Advanced Scheduling & Critical Path (LATER-001)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
@Controller("advanced-scheduling")
export class AdvancedSchedulingController {
  constructor(private readonly service: AdvancedSchedulingService) {}

  @Get("cpm/:projectId")
  @ApiOperation({ summary: "Calculate Critical Path Method (CPM) for a project network" })
  @Permissions("SCHEDULE_SCENARIOS:READ")
  calculateCPM(@Param("projectId") projectId: string) {
    return this.service.calculateProjectCPM(projectId);
  }

  @Get("scenarios")
  @ApiOperation({ summary: "List What-If schedule scenarios" })
  @Permissions("SCHEDULE_SCENARIOS:READ")
  getScenarios(@Query() query: ScenarioQueryDto) {
    return this.service.getScenarios(query);
  }

  @Get("scenarios/:id")
  @ApiOperation({ summary: "Get What-If scenario details and task overrides" })
  @Permissions("SCHEDULE_SCENARIOS:READ")
  getScenarioById(@Param("id") id: string) {
    return this.service.getScenarioById(id);
  }

  @Post("scenarios")
  @ApiOperation({ summary: "Create What-If schedule scenario and seed simulation overrides" })
  @Permissions("SCHEDULE_SCENARIOS:MANAGE")
  createScenario(@Body() dto: CreateScenarioDto, @Req() req: any) {
    return this.service.createScenario(dto, req.user?.id);
  }

  @Patch("scenarios/:id/overrides/:overrideId")
  @ApiOperation({ summary: "Update task simulation override in a What-If scenario" })
  @Permissions("SCHEDULE_SCENARIOS:MANAGE")
  updateOverride(
    @Param("id") scenarioId: string,
    @Param("overrideId") overrideId: string,
    @Body() dto: UpdateScenarioOverrideDto,
    @Req() req: any,
  ) {
    return this.service.updateScenarioOverride(scenarioId, overrideId, dto, req.user?.id);
  }

  @Post("scenarios/:id/simulate")
  @ApiOperation({ summary: "Run simulation calculation on a scenario" })
  @Permissions("SCHEDULE_SCENARIOS:MANAGE")
  simulateScenario(@Param("id") id: string, @Req() req: any) {
    return this.service.simulateScenario(id, req.user?.id);
  }

  @Post("scenarios/:id/apply")
  @ApiOperation({ summary: "Explicitly apply simulated scenario dates to live tasks" })
  @Permissions("SCHEDULE_SCENARIOS:APPLY")
  applyScenario(@Param("id") id: string, @Req() req: any) {
    return this.service.applyScenario(id, req.user?.id);
  }

  // =========================================================================
  // HEALTH ENGINE ENDPOINTS
  // =========================================================================

  @Get("health/:projectId")
  @ApiOperation({ summary: "Evaluate calibrated composite health score for a project" })
  @Permissions("SCHEDULE_SCENARIOS:READ")
  getProjectHealth(@Param("projectId") projectId: string) {
    return this.service.evaluateProjectHealth(projectId);
  }

  @Get("health/:projectId/history")
  @ApiOperation({ summary: "Fetch historical health score snapshots" })
  @Permissions("SCHEDULE_SCENARIOS:READ")
  getHealthHistory(@Param("projectId") projectId: string) {
    return this.service.getHealthHistory(projectId);
  }

  @Get("health-config")
  @ApiOperation({ summary: "Get project or global health score configuration" })
  @Permissions("SCHEDULE_SCENARIOS:READ")
  getHealthConfig(@Query("projectId") projectId?: string) {
    return this.service.getHealthConfig(projectId);
  }

  @Put("health-config")
  @ApiOperation({ summary: "Upsert project or global health score configuration" })
  @Permissions("PROJECT_HEALTH:MANAGE")
  upsertHealthConfig(@Body() dto: UpsertHealthConfigDto, @Req() req: any) {
    return this.service.upsertHealthConfig(dto, req.user?.id);
  }

  @Post("health-override")
  @ApiOperation({ summary: "Record or clear manual PM override for project health" })
  @Permissions("PROJECT_HEALTH:MANAGE")
  recordHealthOverride(@Body() dto: RecordHealthOverrideDto, @Req() req: any) {
    return this.service.recordHealthOverride(dto, req.user?.id);
  }
}
