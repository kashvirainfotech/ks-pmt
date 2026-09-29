import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { QueryMilestoneDto } from './dto/query-milestone.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/validators/record-id';

@ApiTags('Project & Product Milestones (PLAN-001)')
@ApiBearerAuth('JWT-auth')
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post()
  @RequirePermissions('MILESTONES:MANAGE')
  @ApiOperation({ summary: 'Create a new milestone' })
  async create(
    @Body() dto: CreateMilestoneDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.milestonesService.create(dto, userId) };
  }

  @Get()
  @RequirePermissions('MILESTONES:READ')
  @ApiOperation({ summary: 'List milestones with pagination and filters' })
  async findAll(@Query() query: QueryMilestoneDto) {
    const result = await this.milestonesService.findAll(query);
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
  @RequirePermissions('MILESTONES:READ')
  @ApiOperation({ summary: 'Get milestone details and linked tasks' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.milestonesService.findById(id) };
  }

  @Put(':id')
  @RequirePermissions('MILESTONES:MANAGE')
  @ApiOperation({ summary: 'Update milestone details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.milestonesService.update(id, dto, userId) };
  }

  @Delete(':id')
  @RequirePermissions('MILESTONES:MANAGE')
  @ApiOperation({ summary: 'Deactivate milestone' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.milestonesService.remove(id, userId) };
  }
}
