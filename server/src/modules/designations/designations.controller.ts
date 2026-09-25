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
import { DesignationsService } from './designations.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Designations')
@ApiBearerAuth('JWT-auth')
@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Create a new job designation' })
  @ApiResponse({ status: 201, description: 'Designation created' })
  async create(
    @Body() dto: CreateDesignationDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.designationsService.create(dto, userId);
    return {
      message: 'Designation created successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List designations with hierarchy ordering' })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @Query('departmentId') departmentId?: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    const data = await this.designationsService.findAll(departmentId, includeInactive);
    return {
      message: 'Designations retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get designation by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.designationsService.findOne(id);
    return {
      message: 'Designation retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Update designation' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignationDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.designationsService.update(id, dto, userId);
    return {
      message: 'Designation updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Toggle designation active status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.designationsService.toggleActive(id, isActive, userId);
    return {
      message: `Designation status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }
}
