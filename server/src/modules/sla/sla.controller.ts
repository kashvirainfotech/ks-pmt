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
import { SlaService } from './sla.service';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { StartSlaCycleDto } from './dto/start-sla-cycle.dto';
import {
  FirstResponseActionDto,
  ResolutionActionDto,
  PauseCycleDto,
  ExtendDeadlineDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
} from './dto/sla-action.dto';

@Controller('sla')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  // ==========================================
  // SLA Policies Endpoints
  // ==========================================

  @Post('policies')
  @Permissions('SLA:MANAGE')
  createPolicy(@Body() dto: CreateSlaPolicyDto, @Req() req: any) {
    return this.slaService.createPolicy(dto, req.user?.id);
  }

  @Get('policies')
  @Permissions('SLA:READ')
  findAllPolicies(
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
    @Query('tier') tier?: string,
  ) {
    return this.slaService.findAllPolicies({ clientId, projectId, tier });
  }

  @Get('policies/:id')
  @Permissions('SLA:READ')
  findPolicyById(@Param('id') id: string) {
    return this.slaService.findPolicyById(id);
  }

  @Put('policies/:id')
  @Permissions('SLA:MANAGE')
  updatePolicy(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSlaPolicyDto>,
    @Req() req: any,
  ) {
    return this.slaService.updatePolicy(id, dto, req.user?.id);
  }

  @Delete('policies/:id')
  @Permissions('SLA:MANAGE')
  deletePolicy(@Param('id') id: string, @Req() req: any) {
    return this.slaService.deletePolicy(id, req.user?.id);
  }

  // ==========================================
  // SLA Tracking Cycles Endpoints
  // ==========================================

  @Post('cycles')
  @Permissions('SLA:OPERATE')
  startCycle(@Body() dto: StartSlaCycleDto, @Req() req: any) {
    return this.slaService.startCycle(dto, req.user?.id);
  }

  @Get('cycles')
  @Permissions('SLA:READ')
  findAllCycles(
    @Query('taskId') taskId?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.slaService.findAllCycles({ taskId, status, projectId });
  }

  @Get('cycles/:id')
  @Permissions('SLA:READ')
  findCycleById(@Param('id') id: string) {
    return this.slaService.findCycleById(id);
  }

  @Post('cycles/:id/first-response')
  @Permissions('SLA:OPERATE')
  recordFirstResponse(
    @Param('id') id: string,
    @Body() dto: FirstResponseActionDto,
    @Req() req: any,
  ) {
    return this.slaService.recordFirstResponse(id, dto, req.user?.id);
  }

  @Post('cycles/:id/resolution')
  @Permissions('SLA:OPERATE')
  recordResolution(
    @Param('id') id: string,
    @Body() dto: ResolutionActionDto,
    @Req() req: any,
  ) {
    return this.slaService.recordResolution(id, dto, req.user?.id);
  }

  @Post('cycles/:id/pause')
  @Permissions('SLA:OPERATE')
  pauseCycle(
    @Param('id') id: string,
    @Body() dto: PauseCycleDto,
    @Req() req: any,
  ) {
    return this.slaService.pauseCycle(id, dto, req.user?.id);
  }

  @Post('cycles/:id/resume')
  @Permissions('SLA:OPERATE')
  resumeCycle(@Param('id') id: string, @Req() req: any) {
    return this.slaService.resumeCycle(id, req.user?.id);
  }

  @Post('cycles/:id/extend')
  @Permissions('SLA:OPERATE')
  extendDeadline(
    @Param('id') id: string,
    @Body() dto: ExtendDeadlineDto,
    @Req() req: any,
  ) {
    return this.slaService.extendDeadline(id, dto, req.user?.id);
  }

  @Post('cycles/:id/reopen')
  @Permissions('SLA:OPERATE')
  reopenCycle(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.slaService.reopenCycle(id, reason, req.user?.id);
  }

  // ==========================================
  // Rule-Based Risk Alerts Endpoints
  // ==========================================

  @Post('alerts/evaluate')
  @Permissions('SLA:OPERATE')
  evaluateRiskAlerts(
    @Query('projectId') projectId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.slaService.evaluateRiskAlerts({ projectId, clientId });
  }

  @Get('alerts')
  @Permissions('SLA:READ')
  findAllAlerts(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.slaService.findAllAlerts({ status, severity, projectId });
  }

  @Post('alerts/:id/acknowledge')
  @Permissions('SLA:OPERATE')
  acknowledgeAlert(
    @Param('id') id: string,
    @Body() dto: AcknowledgeAlertDto,
    @Req() req: any,
  ) {
    return this.slaService.acknowledgeAlert(id, dto, req.user?.id);
  }

  @Post('alerts/:id/resolve')
  @Permissions('SLA:OPERATE')
  resolveAlert(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @Req() req: any,
  ) {
    return this.slaService.resolveAlert(id, dto, req.user?.id);
  }

  @Post('alerts/:id/dismiss')
  @Permissions('SLA:OPERATE')
  dismissAlert(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Req() req: any,
  ) {
    return this.slaService.dismissAlert(id, notes || 'Dismissed by user', req.user?.id);
  }

  // ==========================================
  // Executive Dashboard & Metrics
  // ==========================================

  @Get('dashboard')
  @Permissions('SLA:READ')
  getSlaDashboard(
    @Query('projectId') projectId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.slaService.getSlaDashboard(projectId, clientId);
  }
}
