import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { RaidService } from './raid.service';
import { CreateRaidItemDto } from './dto/create-raid-item.dto';
import { UpdateRaidItemDto } from './dto/update-raid-item.dto';
import { CreateClientActionRequestDto } from './dto/create-client-action-request.dto';
import { QueryRaidDto, QueryClientActionDto } from './dto/query-raid.dto';

@ApiTags('RAID, Decisions & Client Actions (DEL-001)')
@Controller('raid')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class RaidController {
  constructor(private readonly raidService: RaidService) {}

  // ==========================================
  // RAID Items
  // ==========================================

  @Post('items')
  @RequirePermissions('RAID:MANAGE')
  @ApiOperation({ summary: 'Create a new RAID item (Risk, Assumption, Decision, Issue)' })
  async createRaidItem(@Body() dto: CreateRaidItemDto, @Req() req: any) {
    const data = await this.raidService.createRaidItem(dto, req.user);
    return {
      message: `${dto.category} recorded successfully`,
      data,
    };
  }

  @Get('items')
  @RequirePermissions('RAID:READ')
  @ApiOperation({ summary: 'List RAID items with filtering and search' })
  async getRaidItems(@Query() query: QueryRaidDto) {
    const data = await this.raidService.getRaidItems(query);
    return {
      message: 'RAID items retrieved successfully',
      data,
    };
  }

  @Get('items/:id')
  @RequirePermissions('RAID:READ')
  @ApiOperation({ summary: 'Get RAID item detail with revision history and actions' })
  async getRaidItemById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.raidService.getRaidItemById(id);
    return {
      message: 'RAID item detail retrieved successfully',
      data,
    };
  }

  @Put('items/:id')
  @RequirePermissions('RAID:MANAGE')
  @ApiOperation({ summary: 'Update RAID item and record immutable revision' })
  async updateRaidItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRaidItemDto,
    @Req() req: any,
  ) {
    const data = await this.raidService.updateRaidItem(id, dto, req.user);
    return {
      message: 'RAID item updated successfully',
      data,
    };
  }

  @Delete('items/:id')
  @RequirePermissions('RAID:MANAGE')
  @ApiOperation({ summary: 'Archive a RAID item' })
  async deleteRaidItem(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const data = await this.raidService.deleteRaidItem(id, req.user);
    return data;
  }

  @Post('items/:id/supersede')
  @RequirePermissions('RAID:MANAGE')
  @ApiOperation({ summary: 'Supersede an architectural/project decision with a successor' })
  async supersedeDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      newTitle: string;
      rationale: string;
      context?: string;
      alternativesConsidered?: any[];
      consequences?: string;
      technicalImpact?: string;
      businessImpact?: string;
      participants?: any[];
      isClientShared?: boolean;
      clientVisibility?: any;
      clientSummary?: string;
      changeSummary?: string;
    },
    @Req() req: any,
  ) {
    const data = await this.raidService.supersedeDecision(id, dto, req.user);
    return data;
  }

  // ==========================================
  // Client Action Requests
  // ==========================================

  @Post('action-requests')
  @RequirePermissions('CLIENT_ACTIONS:MANAGE')
  @ApiOperation({ summary: 'Publish a client action or decision request' })
  async createClientActionRequest(
    @Body() dto: CreateClientActionRequestDto,
    @Req() req: any,
  ) {
    const data = await this.raidService.createClientActionRequest(dto, req.user);
    return {
      message: 'Client action request published successfully',
      data,
    };
  }

  @Get('action-requests')
  @RequirePermissions('RAID:READ')
  @ApiOperation({ summary: 'List client action requests' })
  async getClientActionRequests(@Query() query: QueryClientActionDto) {
    const data = await this.raidService.getClientActionRequests(query);
    return {
      message: 'Client action requests retrieved successfully',
      data,
    };
  }

  @Post('action-requests/:id/resolve')
  @RequirePermissions('CLIENT_ACTIONS:MANAGE')
  @ApiOperation({ summary: 'Mark a client action request as resolved' })
  async resolveClientActionRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      resultingDecision: string;
      resultingChangeRequestId?: string;
      notes?: string;
    },
    @Req() req: any,
  ) {
    const data = await this.raidService.resolveClientActionRequest(id, dto, req.user);
    return {
      message: 'Client action request marked as resolved',
      data,
    };
  }
}
