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
  ApiTags,
} from '@nestjs/swagger';
import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CloseSprintDto } from './dto/close-sprint.dto';
import { AddSprintTasksDto, RemoveSprintTaskDto } from './dto/sprint-task-scope.dto';
import { QuerySprintDto } from './dto/query-sprint.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/validators/record-id';

@ApiTags('Agile Sprints & Planning (PLAN-001)')
@ApiBearerAuth('JWT-auth')
@Controller('sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  @RequirePermissions('SPRINTS:MANAGE')
  @ApiOperation({ summary: 'Create a new agile sprint' })
  async create(
    @Body() dto: CreateSprintDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.sprintsService.create(dto, userId) };
  }

  @Get()
  @RequirePermissions('SPRINTS:READ')
  @ApiOperation({ summary: 'List agile sprints with pagination and filters' })
  async findAll(@Query() query: QuerySprintDto) {
    const result = await this.sprintsService.findAll(query);
    return {
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id')
  @RequirePermissions('SPRINTS:READ')
  @ApiOperation({ summary: 'Get sprint details with current tasks and metrics' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.sprintsService.findById(id) };
  }

  @Put(':id')
  @RequirePermissions('SPRINTS:MANAGE')
  @ApiOperation({ summary: 'Update sprint details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSprintDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.sprintsService.update(id, dto, userId) };
  }

  @Post(':id/start')
  @RequirePermissions('SPRINTS:MANAGE')
  @ApiOperation({ summary: 'Start sprint: Snapshots initial commitment and scope' })
  async startSprint(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.sprintsService.startSprint(id, userId) };
  }

  @Post(':id/close')
  @RequirePermissions('SPRINTS:MANAGE')
  @ApiOperation({ summary: 'Close sprint: Computes completed metrics and handles task rollover' })
  async closeSprint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseSprintDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.sprintsService.closeSprint(id, dto, userId) };
  }

  @Post(':id/tasks')
  @RequirePermissions('SPRINTS:MANAGE')
  @ApiOperation({ summary: 'Add tasks to sprint with scope change reason audit' })
  async addTasks(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSprintTasksDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.sprintsService.addTasks(id, dto, userId) };
  }

  @Delete(':id/tasks/:taskId')
  @RequirePermissions('SPRINTS:MANAGE')
  @ApiOperation({ summary: 'Remove a task from sprint back to backlog' })
  async removeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: RemoveSprintTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return {
      data: await this.sprintsService.removeTask(id, taskId, dto, userId),
    };
  }

  @Get(':id/scope-ledger')
  @RequirePermissions('SPRINTS:READ')
  @ApiOperation({ summary: 'Get sprint scope change ledger (audit additions, removals, rollovers)' })
  async getScopeLedger(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.sprintsService.getScopeLedger(id) };
  }

  @Get(':id/capacity')
  @RequirePermissions('SPRINTS:READ')
  @ApiOperation({ summary: 'Calculate sprint team capacity using calendar workweek, holidays, and leaves' })
  async calculateSprintCapacity(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.sprintsService.calculateSprintCapacity(id) };
  }
}
