import { ParseUUIDPipe } from '../../common/validators/record-id';
import {
  Body,
  Controller,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateSubtaskDto, ToggleSubtaskDto } from './dto/subtask.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/change-status.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks & Workflows')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post(':id/subtasks')
  @RequirePermissions('TASKS:CREATE')
  async createSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSubtaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const parent = await this.tasksService.findOne(id);
    return {
      data: await this.tasksService.create(
        {
          title: dto.title,
          parentTaskId: id,
          taskTypeId: parent.task_type_id,
          projectId: parent.project_id || undefined,
          productId: parent.product_id || undefined,
          versionId: parent.version_id || undefined,
          branchId: parent.branch_id || undefined,
          plannedEndDate: dto.dueDate,
          assigneeIds: dto.assignedToUserId ? [dto.assignedToUserId] : [],
        },
        userId,
      ),
    };
  }

  @Patch('subtasks/:id/toggle')
  @RequirePermissions('TASKS:STATUS_CHANGE')
  async toggleSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleSubtaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return {
      data: await this.tasksService.toggleSubtask(id, dto.isCompleted, userId),
    };
  }

  @Post()
  @RequirePermissions('TASKS:CREATE')
  @ApiOperation({
    summary: 'Create a new task with multi-assignees and subtask hierarchy',
    description:
      'Supports project/product scoping, estimated hours, chargeable tracking, and auto-assignment matrix evaluation.',
  })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async create(@Body() dto: CreateTaskDto, @CurrentUser('id') userId: string) {
    const data = await this.tasksService.create(dto, userId);
    return {
      message: 'Task created successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('TASKS:READ')
  @ApiOperation({
    summary:
      'List tasks with advanced filtering (project, status, assignee, priority, search)',
  })
  async findAll(@Query() query: QueryTaskDto) {
    const result = await this.tasksService.findAll(query);
    return {
      message: 'Tasks retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('TASKS:READ')
  @ApiOperation({
    summary:
      'Get full task details with assignees, subtask count, and logged effort',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.tasksService.findOne(id);
    return {
      message: 'Task details retrieved successfully',
      data,
    };
  }

  @Get(':id/subtasks')
  @RequirePermissions('TASKS:READ')
  @ApiOperation({ summary: 'Get direct subtasks hierarchy for a parent task' })
  async findSubtasks(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.tasksService.findSubtasks(id);
    return {
      message: 'Subtasks retrieved successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('TASKS:STATUS_CHANGE')
  @ApiOperation({
    summary: 'Progress task status through the dynamic state machine',
    description:
      'Enforces allowable transitions defined in workflow status matrix and triggers auto-reassignment rules.',
  })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTaskStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tasksService.changeStatus(id, dto, userId);
    return {
      message: 'Task status updated successfully',
      data,
    };
  }

  @Put(':id/assignees')
  @RequirePermissions('TASKS:ASSIGN')
  @ApiOperation({ summary: 'Assign or reassign employees to a task' })
  async assignUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tasksService.assignUsers(id, dto, userId);
    return {
      message: 'Task assignees updated successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('TASKS:UPDATE')
  @ApiOperation({
    summary: 'Update task properties, estimates, or chargeable amounts',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.tasksService.update(id, dto, userId);
    return {
      message: 'Task updated successfully',
      data,
    };
  }
}
