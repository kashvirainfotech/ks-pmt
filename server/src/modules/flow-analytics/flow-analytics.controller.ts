import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { FlowAnalyticsService } from './flow-analytics.service';
import { CreateWipLimitDto } from './dto/create-wip-limit.dto';
import { CreateWipOverrideExceptionDto } from './dto/wip-override.dto';
import { CreateFlowAgingConfigDto } from './dto/create-flow-aging.dto';
import { FlowQueryDto, CheckWipLimitDto, RebuildCfdDto } from './dto/flow-query.dto';

@Controller('flow-analytics')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class FlowAnalyticsController {
  constructor(private readonly flowService: FlowAnalyticsService) {}

  // ==========================================
  // WIP Limits & Boards
  // ==========================================

  @Get('wip-limits')
  @Permissions('FLOW:READ')
  async getWipLimits(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
    @Query('limitType') limitType?: string,
  ) {
    return this.flowService.getWipLimits({ projectId, teamId, userId, limitType });
  }

  @Post('wip-limits')
  @Permissions('FLOW:MANAGE')
  async createWipLimit(@Body() dto: CreateWipLimitDto, @Req() req: any) {
    return this.flowService.createWipLimit(dto, req.user.id);
  }

  @Put('wip-limits/:id')
  @Permissions('FLOW:MANAGE')
  async updateWipLimit(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWipLimitDto>,
    @Req() req: any,
  ) {
    return this.flowService.updateWipLimit(id, dto, req.user.id);
  }

  @Delete('wip-limits/:id')
  @Permissions('FLOW:MANAGE')
  async deleteWipLimit(@Param('id') id: string, @Req() req: any) {
    return this.flowService.deleteWipLimit(id, req.user.id);
  }

  @Post('check-wip')
  @Permissions('FLOW:READ')
  async checkWipLimits(@Body() dto: CheckWipLimitDto) {
    return this.flowService.checkWipLimits(dto);
  }

  @Get('wip-board')
  @Permissions('FLOW:READ')
  async getWipBoard(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.flowService.getCurrentWipBoard(projectId, teamId);
  }

  // ==========================================
  // WIP Override Exceptions
  // ==========================================

  @Post('wip-override-exceptions')
  @Permissions('FLOW:OVERRIDE')
  async createOverrideException(
    @Body() dto: CreateWipOverrideExceptionDto,
    @Req() req: any,
  ) {
    return this.flowService.createOverrideException(dto, req.user.id);
  }

  @Get('wip-override-exceptions')
  @Permissions('FLOW:READ')
  async getOverrideExceptions(
    @Query('projectId') projectId?: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.flowService.getOverrideExceptions({ projectId, taskId });
  }

  // ==========================================
  // Operational Aging
  // ==========================================

  @Get('operational-aging')
  @Permissions('FLOW:READ')
  async getOperationalAging(@Query() query: FlowQueryDto) {
    return this.flowService.getOperationalAging(query);
  }

  // ==========================================
  // Flow Time Partitioning (Active vs Waiting)
  // ==========================================

  @Get('flow-time-partition')
  @Permissions('FLOW:READ')
  async getFlowTimePartition(@Query() query: FlowQueryDto) {
    return this.flowService.getFlowTimePartition(query);
  }

  // ==========================================
  // Lead & Cycle Time Distributions
  // ==========================================

  @Get('cycle-time-metrics')
  @Permissions('FLOW:READ')
  async getCycleTimeMetrics(@Query() query: FlowQueryDto) {
    return this.flowService.getCycleTimeMetrics(query);
  }

  // ==========================================
  // Cumulative Flow Diagrams (CFD) & Dwell Time
  // ==========================================

  @Get('cumulative-flow')
  @Permissions('FLOW:READ')
  async getCumulativeFlow(
    @Query('projectId') projectId?: string,
    @Query('sprintId') sprintId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.flowService.getCumulativeFlowData(projectId, sprintId, startDate, endDate);
  }

  @Post('rebuild-cfd')
  @Permissions('FLOW:MANAGE')
  async rebuildCfd(@Body() dto: RebuildCfdDto, @Req() req: any) {
    return this.flowService.rebuildCfdSnapshots(dto, req.user.id);
  }

  @Get('dwell-time-heatmap')
  @Permissions('FLOW:READ')
  async getDwellTimeHeatmap(
    @Query('projectId') projectId?: string,
    @Query('sprintId') sprintId?: string,
  ) {
    return this.flowService.getDwellTimeHeatmap(projectId, sprintId);
  }

  // ==========================================
  // Aging Configurations
  // ==========================================

  @Get('aging-configs')
  @Permissions('FLOW:READ')
  async getAgingConfigs(@Query('projectId') projectId?: string) {
    return this.flowService.getFlowAgingConfigs(projectId);
  }

  @Post('aging-configs')
  @Permissions('FLOW:MANAGE')
  async createAgingConfig(
    @Body() dto: CreateFlowAgingConfigDto,
    @Req() req: any,
  ) {
    return this.flowService.createFlowAgingConfig(dto, req.user.id);
  }
}
