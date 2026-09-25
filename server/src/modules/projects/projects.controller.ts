import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AllocateMemberDto } from './dto/allocate-member.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Projects & Team Allocations')
@ApiBearerAuth('JWT-auth')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions('PROJECTS:CREATE')
  @ApiOperation({ summary: 'Create a new custom development project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.projectsService.create(dto, userId);
    return {
      message: 'Project created successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('PROJECTS:READ')
  @ApiOperation({ summary: 'List custom development projects with search and filters' })
  async findAll(@Query() query: QueryProjectDto) {
    const result = await this.projectsService.findAll(query);
    return {
      message: 'Projects retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('PROJECTS:READ')
  @ApiOperation({ summary: 'Get project details by ID with allocated team and planned versions' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.projectsService.findOne(id);
    return {
      message: 'Project retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('PROJECTS:UPDATE')
  @ApiOperation({ summary: 'Update project properties, dates, and commercial amounts' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.projectsService.update(id, dto, userId);
    return {
      message: 'Project updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('PROJECTS:UPDATE')
  @ApiOperation({ summary: 'Toggle project active status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.projectsService.toggleActive(id, isActive, userId);
    return {
      message: `Project status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }

  // ----------------------------------------------------
  // Team Allocations
  // ----------------------------------------------------

  @Post(':id/members')
  @RequirePermissions('PROJECTS:UPDATE')
  @ApiOperation({ summary: 'Allocate an employee to this project team' })
  async allocateMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: AllocateMemberDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.projectsService.allocateMember(projectId, dto, userId);
    return {
      message: 'Team member allocated successfully',
      data,
    };
  }

  @Get(':id/members')
  @RequirePermissions('PROJECTS:READ')
  @ApiOperation({ summary: 'List team members allocated to this project' })
  async findMembers(@Param('id', ParseUUIDPipe) projectId: string) {
    const data = await this.projectsService.findMembers(projectId);
    return {
      message: 'Project team members retrieved successfully',
      data,
    };
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('PROJECTS:UPDATE')
  @ApiOperation({ summary: 'Deallocate a team member from this project' })
  async removeMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const data = await this.projectsService.removeMember(projectId, userId);
    return {
      message: data.message,
      data: { success: data.success },
    };
  }

  // ----------------------------------------------------
  // Financial Overview
  // ----------------------------------------------------

  @Get(':id/financial-summary')
  @RequirePermissions('PROJECTS:VIEW_FINANCIALS')
  @ApiOperation({
    summary: 'Get project financial breakdown and budget vs. actual hours',
    description: 'Requires PROJECTS:VIEW_FINANCIALS permission (enforced with dynamic branch/user overrides).',
  })
  async getFinancialSummary(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.projectsService.getFinancialSummary(id);
    return {
      message: 'Project financial summary retrieved successfully',
      data,
    };
  }
}
