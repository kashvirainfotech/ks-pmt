import {
  Controller,
  Get,
  Post,
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
import { CapacityInsightsService } from './capacity-insights.service';
import { CreateSkillDto, AssignUserSkillDto, SetTaskRequiredSkillDto } from './dto/create-skill.dto';
import { CreateCapacityReservationDto } from './dto/capacity-reservation.dto';
import { SplitCoAssigneeEffortDto } from './dto/split-effort.dto';
import { CapacityWorkloadQueryDto } from './dto/capacity-query.dto';

@Controller('capacity-insights')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class CapacityInsightsController {
  constructor(private readonly capacityService: CapacityInsightsService) {}

  // ==========================================
  // Capacity & Workload
  // ==========================================

  @Get('workload')
  @Permissions('CAPACITY:READ')
  async getCapacityWorkload(@Query() query: CapacityWorkloadQueryDto) {
    return this.capacityService.getCapacityWorkload(query);
  }

  @Post('tasks/:taskId/split-effort')
  @Permissions('CAPACITY:MANAGE')
  async splitCoAssigneeEffort(
    @Param('taskId') taskId: string,
    @Body() dto: SplitCoAssigneeEffortDto,
    @Req() req: any,
  ) {
    return this.capacityService.splitCoAssigneeEffort(taskId, dto, req.user.id);
  }

  // ==========================================
  // Explainable Skill Suggestions
  // ==========================================

  @Get('tasks/:taskId/skill-suggestions')
  @Permissions('CAPACITY:READ')
  async getSkillSuggestions(@Param('taskId') taskId: string) {
    return this.capacityService.getSkillSuggestions(taskId);
  }

  // ==========================================
  // Team Estimation Reliability
  // ==========================================

  @Get('team-estimation')
  @Permissions('CAPACITY:READ')
  async getTeamEstimationMetrics(
    @Query('teamId') teamId?: string,
    @Query('projectId') projectId?: string,
    @Query('sprintId') sprintId?: string,
  ) {
    return this.capacityService.getTeamEstimationMetrics(teamId, projectId, sprintId);
  }

  // ==========================================
  // Skills Management
  // ==========================================

  @Get('skills')
  @Permissions('CAPACITY:READ')
  async getSkills() {
    return this.capacityService.getSkills();
  }

  @Post('skills')
  @Permissions('CAPACITY:MANAGE')
  async createSkill(@Body() dto: CreateSkillDto, @Req() req: any) {
    return this.capacityService.createSkill(dto, req.user.id);
  }

  @Get('users/:userId/skills')
  @Permissions('CAPACITY:READ')
  async getUserSkills(@Param('userId') userId: string) {
    return this.capacityService.getUserSkills(userId);
  }

  @Post('users/:userId/skills')
  @Permissions('CAPACITY:MANAGE')
  async assignUserSkill(
    @Param('userId') userId: string,
    @Body() dto: AssignUserSkillDto,
    @Req() req: any,
  ) {
    return this.capacityService.assignUserSkill(userId, dto, req.user.id);
  }

  @Get('tasks/:taskId/required-skills')
  @Permissions('CAPACITY:READ')
  async getTaskRequiredSkills(@Param('taskId') taskId: string) {
    return this.capacityService.getSkillSuggestions(taskId);
  }

  @Post('tasks/:taskId/required-skills')
  @Permissions('CAPACITY:MANAGE')
  async setTaskRequiredSkill(
    @Param('taskId') taskId: string,
    @Body() dto: SetTaskRequiredSkillDto,
    @Req() req: any,
  ) {
    return this.capacityService.setTaskRequiredSkill(taskId, dto, req.user.id);
  }

  @Delete('tasks/:taskId/required-skills/:skillId')
  @Permissions('CAPACITY:MANAGE')
  async removeTaskRequiredSkill(
    @Param('taskId') taskId: string,
    @Param('skillId') skillId: string,
  ) {
    return this.capacityService.removeTaskRequiredSkill(taskId, skillId);
  }

  // ==========================================
  // Capacity Reservations (Overhead)
  // ==========================================

  @Get('reservations')
  @Permissions('CAPACITY:READ')
  async getCapacityReservations(
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.capacityService.getCapacityReservations(userId, projectId);
  }

  @Post('reservations')
  @Permissions('CAPACITY:MANAGE')
  async createCapacityReservation(
    @Body() dto: CreateCapacityReservationDto,
    @Req() req: any,
  ) {
    return this.capacityService.createCapacityReservation(dto, req.user.id);
  }

  @Delete('reservations/:id')
  @Permissions('CAPACITY:MANAGE')
  async deleteCapacityReservation(@Param('id') id: string, @Req() req: any) {
    return this.capacityService.deleteCapacityReservation(id, req.user.id);
  }
}
