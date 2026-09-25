import { ParseUUIDPipe } from '../../common/validators/record-id';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions('AUDIT_LOGS:VIEW')
  async findAll(@Query() query: QueryAuditLogDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('AUDIT_LOGS:VIEW')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogsService.findById(id);
  }
}
