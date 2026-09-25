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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PermissionOverrideDto } from './dto/permission-override.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users & Employees')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({
    summary: 'Provision a new employee / system user',
    description:
      'Admin-only user creation with primary & secondary branch mapping, department, designation, and credentials.',
  })
  @ApiResponse({ status: 201, description: 'User provisioned successfully' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') creatorUserId: string,
  ) {
    const data = await this.usersService.create(dto, creatorUserId);
    return {
      message: 'Employee account provisioned successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List employees with pagination, search, and branch/dept filters',
  })
  async findAll(@Query() query: QueryUserDto) {
    const result = await this.usersService.findAll(query);
    return {
      message: 'Employees retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get employee details by ID including branch mappings and permission overrides',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.findOne(id);
    return {
      message: 'Employee profile retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Update employee details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') updaterUserId: string,
  ) {
    const data = await this.usersService.update(id, dto, updaterUserId);
    return {
      message: 'Employee updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Toggle employee active / inactive status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') updaterUserId: string,
  ) {
    const data = await this.usersService.toggleActive(
      id,
      isActive,
      updaterUserId,
    );
    return {
      message: `Employee account status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }

  @Post(':id/permission-overrides')
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({
    summary: 'Grant or revoke dynamic user-level permission override',
    description:
      'Explicit user-level overrides take precedence over the base role permissions.',
  })
  async setPermissionOverride(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: PermissionOverrideDto,
    @CurrentUser('id') updaterUserId: string,
  ) {
    const data = await this.usersService.setPermissionOverride(
      userId,
      dto,
      updaterUserId,
    );
    return {
      message: 'User permission override updated successfully',
      data,
    };
  }

  @Delete(':id/permission-overrides/:permissionId')
  @RequirePermissions('USERS:MANAGE')
  @ApiOperation({ summary: 'Delete a user-level permission override' })
  async deletePermissionOverride(
    @Param('id', ParseUUIDPipe) userId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    await this.usersService.deletePermissionOverride(userId, permissionId);
    return {
      message: 'Permission override removed successfully',
      data: { success: true },
    };
  }
}
