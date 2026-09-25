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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Branches & Locations')
@ApiBearerAuth('JWT-auth')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermissions('BRANCHES:MANAGE')
  @ApiOperation({ summary: 'Create a new company branch / location' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  async create(
    @Body() dto: CreateBranchDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.branchesService.create(dto, userId);
    return {
      message: 'Branch created successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('BRANCHES:READ')
  @ApiOperation({ summary: 'List all company branches' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    const data = await this.branchesService.findAll(includeInactive);
    return {
      message: 'Branches retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('BRANCHES:READ')
  @ApiOperation({ summary: 'Get details of a specific branch' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.branchesService.findOne(id);
    return {
      message: 'Branch retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('BRANCHES:MANAGE')
  @ApiOperation({ summary: 'Update branch information' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.branchesService.update(id, dto, userId);
    return {
      message: 'Branch updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('BRANCHES:MANAGE')
  @ApiOperation({ summary: 'Toggle branch active / inactive status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.branchesService.toggleActive(id, isActive, userId);
    return {
      message: `Branch status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }
}
