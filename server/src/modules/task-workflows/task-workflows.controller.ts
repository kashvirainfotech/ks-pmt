import { ParseUUIDPipe } from '../../common/validators/record-id';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TaskWorkflowsService } from './task-workflows.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateWorkflowTransitionDto } from './dto/create-workflow-transition.dto';
import {
  CloneWorkflowSchemeDto,
  ConfigureSchemeTransitionsDto,
  CreateWorkflowSchemeDto,
  PublishWorkflowSchemeDto,
  UpdateWorkflowSchemeDto,
} from './dto/workflow-scheme.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Task Workflows & Statuses')
@ApiBearerAuth('JWT-auth')
@Controller('task-workflows')
export class TaskWorkflowsController {
  constructor(private readonly workflowsService: TaskWorkflowsService) {}

  // ----------------------------------------------------
  // Statuses
  // ----------------------------------------------------

  @Post('statuses')
  @RequirePermissions('TASKS:CREATE')
  @ApiOperation({ summary: 'Create a new dynamic task status' })
  @ApiResponse({ status: 201, description: 'Status created' })
  async createStatus(
    @Body() dto: CreateStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.createStatus(dto, userId);
    return {
      message: 'Status created successfully',
      data,
    };
  }

  @Get('statuses')
  @ApiOperation({
    summary: 'List all dynamic task statuses ordered by sequence',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAllStatuses(@Query('includeInactive') includeInactive?: boolean) {
    const data = await this.workflowsService.findAllStatuses(includeInactive);
    return {
      message: 'Statuses retrieved successfully',
      data,
    };
  }

  @Get('statuses/:id')
  @ApiOperation({ summary: 'Get status by ID' })
  async findOneStatus(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.workflowsService.findOneStatus(id);
    return {
      message: 'Status retrieved successfully',
      data,
    };
  }

  @Put('statuses/:id')
  @RequirePermissions('TASKS:UPDATE')
  @ApiOperation({ summary: 'Update dynamic task status' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.updateStatus(id, dto, userId);
    return {
      message: 'Status updated successfully',
      data,
    };
  }

  @Patch('statuses/:id/status')
  @RequirePermissions('TASKS:UPDATE')
  @ApiOperation({ summary: 'Toggle status active / inactive state' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.toggleStatusActive(
      id,
      isActive,
      userId,
    );
    return {
      message: `Status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }

  // ----------------------------------------------------
  // Dynamic Workflow Transitions (Legacy / Global Table)
  // ----------------------------------------------------

  @Post('transitions')
  @RequirePermissions('TASKS:UPDATE')
  @ApiOperation({ summary: 'Add an allowed status transition for a task type' })
  async createTransition(
    @Body() dto: CreateWorkflowTransitionDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.createTransition(dto, userId);
    return {
      message: 'Workflow transition rule added successfully',
      data,
    };
  }

  @Get('transitions/:taskTypeId')
  @ApiOperation({
    summary: 'Get all allowed status transitions for a specific task type',
  })
  async findTransitions(
    @Param('taskTypeId', ParseUUIDPipe) taskTypeId: string,
  ) {
    const data =
      await this.workflowsService.findTransitionsByTaskType(taskTypeId);
    return {
      message: 'Workflow transitions retrieved successfully',
      data,
    };
  }

  @Get('allowed-next-statuses')
  @ApiOperation({
    summary:
      'Evaluate dynamic workflow and get permitted next statuses for an active task',
    description:
      'Enforces the dynamic state machine based on task type, project/product overrides, and current status.',
  })
  @ApiQuery({ name: 'taskTypeId', required: true, type: String })
  @ApiQuery({ name: 'fromStatusId', required: true, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  async getAllowedNextStatuses(
    @Query('taskTypeId', ParseUUIDPipe) taskTypeId: string,
    @Query('fromStatusId', ParseUUIDPipe) fromStatusId: string,
    @Query('projectId') projectId?: string,
    @Query('productId') productId?: string,
    @CurrentUser('role_code') userRole?: string,
  ) {
    const data = await this.workflowsService.getAllowedNextStatuses(
      taskTypeId,
      fromStatusId,
      projectId,
      productId,
      userRole,
    );
    return {
      message: 'Permitted next statuses retrieved successfully',
      data,
    };
  }

  @Delete('transitions/:id')
  @RequirePermissions('TASKS:UPDATE')
  @ApiOperation({ summary: 'Delete an allowed workflow transition rule' })
  async deleteTransition(@Param('id', ParseUUIDPipe) id: string) {
    await this.workflowsService.deleteTransition(id);
    return {
      message: 'Workflow transition deleted successfully',
      data: { success: true },
    };
  }

  // ----------------------------------------------------
  // Workflow Schemes & Overrides (CONFIG-001)
  // ----------------------------------------------------

  @Post('schemes')
  @RequirePermissions('WORKFLOWS:MANAGE')
  @ApiOperation({ summary: 'Create a new workflow scheme (Global, Project, or Product override)' })
  async createScheme(
    @Body() dto: CreateWorkflowSchemeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.createScheme(dto, userId);
    return {
      message: 'Workflow scheme created successfully',
      data,
    };
  }

  @Get('schemes')
  @RequirePermissions('WORKFLOWS:READ')
  @ApiOperation({ summary: 'List workflow schemes with optional filters' })
  async getSchemes(
    @Query('scope') scope?: string,
    @Query('projectId') projectId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.workflowsService.getSchemes({
      scope,
      projectId,
      productId,
      status,
    });
    return {
      message: 'Workflow schemes retrieved successfully',
      data,
    };
  }

  @Get('schemes/:id')
  @RequirePermissions('WORKFLOWS:READ')
  @ApiOperation({ summary: 'Get workflow scheme with all transitions and gate rules' })
  async getSchemeById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.workflowsService.getSchemeById(id);
    return {
      message: 'Workflow scheme retrieved successfully',
      data,
    };
  }

  @Put('schemes/:id')
  @RequirePermissions('WORKFLOWS:MANAGE')
  @ApiOperation({ summary: 'Update workflow scheme details' })
  async updateScheme(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowSchemeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.updateScheme(id, dto, userId);
    return {
      message: 'Workflow scheme updated successfully',
      data,
    };
  }

  @Post('schemes/:id/transitions')
  @RequirePermissions('WORKFLOWS:MANAGE')
  @ApiOperation({ summary: 'Configure transitions and gate rules for a workflow scheme' })
  async configureSchemeTransitions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfigureSchemeTransitionsDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.configureSchemeTransitions(id, dto, userId);
    return {
      message: 'Scheme transitions and gate rules configured successfully',
      data,
    };
  }

  @Get('schemes/:id/validate')
  @RequirePermissions('WORKFLOWS:READ')
  @ApiOperation({ summary: 'Validate workflow graph reachability and soundness' })
  async validateSchemeDraft(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.workflowsService.validateWorkflowDraft(id);
    return {
      message: 'Workflow validation completed',
      data,
    };
  }

  @Post('schemes/:id/publish')
  @RequirePermissions('WORKFLOWS:MANAGE')
  @ApiOperation({ summary: 'Publish workflow scheme with active task remapping' })
  async publishScheme(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishWorkflowSchemeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.publishWorkflowScheme(id, dto, userId);
    return {
      message: 'Workflow scheme published successfully',
      data,
    };
  }

  @Post('schemes/:id/clone')
  @RequirePermissions('WORKFLOWS:MANAGE')
  @ApiOperation({ summary: 'Clone a workflow scheme to another scope' })
  async cloneScheme(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneWorkflowSchemeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.workflowsService.cloneScheme(id, dto, userId);
    return {
      message: 'Workflow scheme cloned successfully',
      data,
    };
  }

  @Get('effective')
  @RequirePermissions('WORKFLOWS:READ')
  @ApiOperation({ summary: 'Inspect the effective workflow resolution and source' })
  async getEffectiveWorkflow(
    @Query('taskTypeId', ParseUUIDPipe) taskTypeId: string,
    @Query('projectId') projectId?: string,
    @Query('productId') productId?: string,
  ) {
    const data = await this.workflowsService.getEffectiveWorkflow({
      taskTypeId,
      projectId,
      productId,
    });
    return {
      message: 'Effective workflow resolved successfully',
      data,
    };
  }
}
