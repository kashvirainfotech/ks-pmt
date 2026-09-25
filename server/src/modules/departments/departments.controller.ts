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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Departments')
@ApiBearerAuth('JWT-auth')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Create a new corporate department' })
  @ApiResponse({ status: 201, description: 'Department created' })
  async create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.departmentsService.create(dto, userId);
    return {
      message: 'Department created successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    const data = await this.departmentsService.findAll(includeInactive);
    return {
      message: 'Departments retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details with designations' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.departmentsService.findOne(id);
    return {
      message: 'Department retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Update department' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.departmentsService.update(id, dto, userId);
    return {
      message: 'Department updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Toggle department active status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.departmentsService.toggleActive(
      id,
      isActive,
      userId,
    );
    return {
      message: `Department status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }
}
