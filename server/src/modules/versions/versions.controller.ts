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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VersionsService } from './versions.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Versions & Release Milestones')
@ApiBearerAuth('JWT-auth')
@Controller('versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Post()
  @RequirePermissions('PROJECTS:UPDATE')
  @ApiOperation({ summary: 'Create a new release version or sprint milestone' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  async create(
    @Body() dto: CreateVersionDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.versionsService.create(dto, userId);
    return {
      message: 'Version created successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all versions and releases' })
  async findAll(
    @Query('productId') productId?: string,
    @Query('projectId') projectId?: string,
  ) {
    const data = await this.versionsService.findAll(productId, projectId);
    return {
      message: 'Versions retrieved successfully',
      data,
    };
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all versions and releases for a software product' })
  async findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    const data = await this.versionsService.findByProduct(productId);
    return {
      message: 'Product versions retrieved successfully',
      data,
    };
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all versions, milestones, and sprints for a custom development project' })
  async findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const data = await this.versionsService.findByProject(projectId);
    return {
      message: 'Project versions retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get version details by ID with scheduled tasks' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.versionsService.findOne(id);
    return {
      message: 'Version details retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('PROJECTS:UPDATE')
  @ApiOperation({ summary: 'Update version release dates and status' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVersionDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.versionsService.update(id, dto, userId);
    return {
      message: 'Version updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('PROJECTS:UPDATE')
  @ApiOperation({ summary: 'Toggle version active status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.versionsService.toggleActive(id, isActive, userId);
    return {
      message: `Version status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }
}
