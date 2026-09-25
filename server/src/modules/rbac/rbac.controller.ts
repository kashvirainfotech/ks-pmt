import { ParseUUIDPipe } from '../../common/validators/record-id';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DatabaseService } from '../../database/database.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
class RoleDto {
  @IsString() @IsNotEmpty() @MaxLength(50) roleCode: string;
  @IsString() @IsNotEmpty() @MaxLength(100) roleName: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class UpdateRoleDto extends PartialType(RoleDto) {}
class EffectDto {
  @IsIn(['inherit', 'grant', 'deny']) effect: string;
}
const scopes = {
  roles: {
    table: 'role_permissions',
    owner: 'role_id',
    master: 'roles',
    flag: '',
  },
  branches: {
    table: 'branch_permission_overrides',
    owner: 'branch_id',
    master: 'branches',
    flag: 'is_allowed',
  },
  users: {
    table: 'user_permission_overrides',
    owner: 'user_id',
    master: 'users',
    flag: 'is_granted',
  },
};
@ApiTags('Role and permission management')
@ApiBearerAuth('JWT-auth')
@Controller('rbac')
@RequirePermissions('USERS:MANAGE')
export class RbacController {
  constructor(private readonly db: DatabaseService) {}
  @Get('roles') async roles() {
    return {
      data: (await this.db.query('SELECT * FROM roles ORDER BY role_name'))
        .rows,
    };
  }
  @Get('permissions') async permissions() {
    return {
      data: (
        await this.db.query(
          'SELECT * FROM permissions WHERE is_active = TRUE ORDER BY module, action',
        )
      ).rows,
    };
  }
  @Post('roles') async create(
    @Body() dto: RoleDto,
    @CurrentUser('id') actor: string,
  ) {
    return {
      data: (
        await this.db.query(
          'INSERT INTO roles (role_code, role_name, description, is_active, created_by, updated_by) VALUES ($1,$2,$3,TRUE,$4,$4) RETURNING *',
          [dto.roleCode, dto.roleName, dto.description, actor],
        )
      ).rows[0],
    };
  }
  @Put('roles/:id') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') actor: string,
  ) {
    const existing = await this.db.query(
      'SELECT role_code FROM roles WHERE id=$1',
      [id],
    );
    if (!existing.rowCount) throw new NotFoundException('Role not found');
    if (
      existing.rows[0].role_code === 'ROLE_SUPER_ADMIN' &&
      dto.isActive === false
    )
      throw new BadRequestException(
        'The super administrator role cannot be disabled',
      );
    return {
      data: (
        await this.db.query(
          'UPDATE roles SET role_name=COALESCE($1,role_name), description=COALESCE($2,description), is_active=COALESCE($3,is_active), updated_by=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *',
          [dto.roleName, dto.description, dto.isActive, actor, id],
        )
      ).rows[0],
    };
  }
  private scope(value: string) {
    if (!Object.prototype.hasOwnProperty.call(scopes, value))
      throw new BadRequestException('Invalid permission scope');
    return scopes[value as keyof typeof scopes];
  }
  @Get(':scope/:id/permissions') async grants(
    @Param('scope') scope: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const s = this.scope(scope);
    return {
      data: (
        await this.db.query(`SELECT * FROM ${s.table} WHERE ${s.owner}=$1`, [
          id,
        ])
      ).rows,
    };
  }
  @Put(':scope/:id/permissions/:permissionId') async set(
    @Param('scope') scope: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @Body() dto: EffectDto,
    @CurrentUser('id') actor: string,
  ) {
    const s = this.scope(scope);
    if (scope === 'roles' && dto.effect === 'deny')
      throw new BadRequestException('Roles support grants only');
    if (dto.effect === 'inherit')
      await this.db.query(
        `DELETE FROM ${s.table} WHERE ${s.owner}=$1 AND permission_id=$2`,
        [id, permissionId],
      );
    else
      await this.db.query(
        `INSERT INTO ${s.table} (${s.owner},permission_id,created_by,updated_by${s.flag ? ',' + s.flag : ''}) VALUES ($1,$2,$3,$3${s.flag ? ',$4' : ''}) ON CONFLICT (${s.owner},permission_id) DO UPDATE SET updated_by=EXCLUDED.updated_by, updated_at=CURRENT_TIMESTAMP${s.flag ? `,${s.flag}=EXCLUDED.${s.flag}` : ''}`,
        s.flag
          ? [id, permissionId, actor, dto.effect === 'grant']
          : [id, permissionId, actor],
      );
    return { data: { success: true } };
  }
}
