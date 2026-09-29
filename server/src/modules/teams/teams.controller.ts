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
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { Permissions } from '../rbac/rbac.decorator';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  CreateComponentDto,
  UpdateComponentDto,
  CreateComponentDependencyDto,
  LinkTaskComponentsDto,
} from './dto/teams.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ==========================================
  // TEAMS ENDPOINTS
  // ==========================================

  @Get()
  @Permissions('TEAMS:READ')
  async getTeams(@Query('projectId') projectId?: string, @Query('productId') productId?: string) {
    return await this.teamsService.getTeams({ projectId, productId });
  }

  @Post()
  @Permissions('TEAMS:MANAGE')
  async createTeam(@Body() dto: CreateTeamDto, @Req() req: any) {
    return await this.teamsService.createTeam(dto, req.user.id);
  }

  @Get(':id')
  @Permissions('TEAMS:READ')
  async getTeamById(@Param('id') id: string) {
    return await this.teamsService.getTeamById(id);
  }

  @Put(':id')
  @Permissions('TEAMS:MANAGE')
  async updateTeam(@Param('id') id: string, @Body() dto: UpdateTeamDto, @Req() req: any) {
    return await this.teamsService.updateTeam(id, dto, req.user.id);
  }

  @Delete(':id')
  @Permissions('TEAMS:MANAGE')
  async deleteTeam(@Param('id') id: string, @Req() req: any) {
    return await this.teamsService.deleteTeam(id, req.user.id);
  }

  // ==========================================
  // TEAM MEMBERS ENDPOINTS
  // ==========================================

  @Post(':id/members')
  @Permissions('TEAMS:MANAGE')
  async addTeamMember(
    @Param('id') teamId: string,
    @Body() dto: AddTeamMemberDto,
    @Req() req: any,
  ) {
    return await this.teamsService.addMember(teamId, dto, req.user.id);
  }

  @Delete(':id/members/:userId')
  @Permissions('TEAMS:MANAGE')
  async removeTeamMember(
    @Param('id') teamId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return await this.teamsService.removeMember(teamId, userId, req.user.id);
  }
}

@Controller('components')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class ComponentsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ==========================================
  // SOFTWARE COMPONENTS CATALOG ENDPOINTS
  // ==========================================

  @Get()
  @Permissions('COMPONENTS:READ')
  async getComponents(
    @Query('entityType') entityType?: string,
    @Query('projectId') projectId?: string,
    @Query('productId') productId?: string,
    @Query('ownerTeamId') ownerTeamId?: string,
    @Query('criticality') criticality?: string,
  ) {
    return await this.teamsService.getComponents({
      entityType,
      projectId,
      productId,
      ownerTeamId,
      criticality,
    });
  }

  @Post()
  @Permissions('COMPONENTS:MANAGE')
  async createComponent(@Body() dto: CreateComponentDto, @Req() req: any) {
    return await this.teamsService.createComponent(dto, req.user.id);
  }

  @Get('architecture-map')
  @Permissions('COMPONENTS:READ')
  async getArchitectureMap(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return await this.teamsService.getComponentArchitectureMap(entityType, entityId);
  }

  @Get(':id')
  @Permissions('COMPONENTS:READ')
  async getComponentById(@Param('id') id: string) {
    return await this.teamsService.getComponentById(id);
  }

  @Put(':id')
  @Permissions('COMPONENTS:MANAGE')
  async updateComponent(
    @Param('id') id: string,
    @Body() dto: UpdateComponentDto,
    @Req() req: any,
  ) {
    return await this.teamsService.updateComponent(id, dto, req.user.id);
  }

  @Delete(':id')
  @Permissions('COMPONENTS:MANAGE')
  async deleteComponent(@Param('id') id: string, @Req() req: any) {
    return await this.teamsService.deleteComponent(id, req.user.id);
  }

  // ==========================================
  // COMPONENT DRILL-DOWN DASHBOARD
  // ==========================================

  @Get(':id/dashboard')
  @Permissions('COMPONENTS:READ')
  async getComponentDashboard(@Param('id') id: string, @Req() req: any) {
    return await this.teamsService.getComponentDashboard(id, req.user);
  }

  // ==========================================
  // ARCHITECTURE DEPENDENCIES
  // ==========================================

  @Post(':id/dependencies')
  @Permissions('COMPONENTS:MANAGE')
  async addDependency(
    @Param('id') componentId: string,
    @Body() dto: CreateComponentDependencyDto,
    @Req() req: any,
  ) {
    return await this.teamsService.addComponentDependency(componentId, dto, req.user.id);
  }

  @Delete('dependencies/:depId')
  @Permissions('COMPONENTS:MANAGE')
  async removeDependency(@Param('depId') depId: string) {
    return await this.teamsService.removeComponentDependency(depId);
  }

  // ==========================================
  // TASK-TO-COMPONENTS MAPPING
  // ==========================================

  @Get('task/:taskId')
  @Permissions('COMPONENTS:READ')
  async getTaskComponents(@Param('taskId') taskId: string) {
    return await this.teamsService.getTaskComponents(taskId);
  }

  @Put('task/:taskId')
  @Permissions('COMPONENTS:MANAGE')
  async linkTaskComponents(
    @Param('taskId') taskId: string,
    @Body() dto: LinkTaskComponentsDto,
    @Req() req: any,
  ) {
    return await this.teamsService.linkTaskComponents(taskId, dto, req.user.id);
  }
}
