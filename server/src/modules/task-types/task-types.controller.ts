import {
  Body,
  Controller,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TaskTypesService } from './task-types.service';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { UpdateTaskTypeDto } from './dto/update-task-type.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Task Types')
@ApiBearerAuth('JWT-auth')
@Controller('task-types')
export class TaskTypesController {
  constructor(private readonly taskTypesService: TaskTypesService) {}

  @Post()
  @RequirePermissions('TASKS:CREATE')
  @ApiOperation({ summary: 'Create a new dynamic task type' })
  @ApiResponse({ status: 201, description: 'Task type created successfully' })
  async create(
    @Body() dto: CreateTaskTypeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.taskTypesService.create(dto, userId);
    return {
      message: 'Task type created successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all dynamic task types' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    const data = await this.taskTypesService.findAll(includeInactive);
    return {
      message: 'Task types retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task type by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.taskTypesService.findOne(id);
    return {
      message: 'Task type retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('TASKS:UPDATE')
  @ApiOperation({ summary: 'Update dynamic task type' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskTypeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.taskTypesService.update(id, dto, userId);
    return {
      message: 'Task type updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('TASKS:UPDATE')
  @ApiOperation({ summary: 'Toggle task type active status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.taskTypesService.toggleActive(id, isActive, userId);
    return {
      message: `Task type status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }
}
