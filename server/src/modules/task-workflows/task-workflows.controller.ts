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
  // Dynamic Workflow Transitions
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
      'Enforces the dynamic state machine based on task type and current status.',
  })
  @ApiQuery({ name: 'taskTypeId', required: true, type: String })
  @ApiQuery({ name: 'fromStatusId', required: true, type: String })
  async getAllowedNextStatuses(
    @Query('taskTypeId', ParseUUIDPipe) taskTypeId: string,
    @Query('fromStatusId', ParseUUIDPipe) fromStatusId: string,
  ) {
    const data = await this.workflowsService.getAllowedNextStatuses(
      taskTypeId,
      fromStatusId,
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
}
