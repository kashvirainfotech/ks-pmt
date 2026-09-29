import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { ParseUUIDPipe } from '../../common/validators/record-id';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { ReviewRevisionDto } from './dto/review-revision.dto';
import { ClientDecisionDto } from './dto/client-decision.dto';
import { LinkCrTasksDto } from './dto/link-cr-tasks.dto';
import { QueryChangeRequestsDto } from './dto/query-change-requests.dto';
import { ChangeRequestsService } from './change-requests.service';

@Controller('change-requests')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class ChangeRequestsController {
  constructor(private readonly changeRequestsService: ChangeRequestsService) {}

  @Post()
  @Permissions('CHANGE_REQUESTS:MANAGE')
  async createChangeRequest(@Body() dto: CreateChangeRequestDto, @Req() req: any) {
    return await this.changeRequestsService.createChangeRequest(dto, req.user.id);
  }

  @Get()
  @Permissions('CHANGE_REQUESTS:READ')
  async getChangeRequests(@Query() query: QueryChangeRequestsDto) {
    return await this.changeRequestsService.getChangeRequests(query);
  }

  @Get(':id')
  @Permissions('CHANGE_REQUESTS:READ')
  async getChangeRequestById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.changeRequestsService.getChangeRequestById(id);
  }

  @Post(':id/submit-review')
  @Permissions('CHANGE_REQUESTS:MANAGE')
  async submitForInternalReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return await this.changeRequestsService.submitForInternalReview(id, req.user.id);
  }

  @Post(':id/revisions/:rev/review')
  @Permissions('CHANGE_REQUESTS:APPROVE')
  async reviewRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rev', ParseIntPipe) rev: number,
    @Body() dto: ReviewRevisionDto,
    @Req() req: any,
  ) {
    return await this.changeRequestsService.reviewRevision(id, rev, dto, req.user.id);
  }

  @Post(':id/revisions')
  @Permissions('CHANGE_REQUESTS:MANAGE')
  async createMaterialRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRevisionDto,
    @Req() req: any,
  ) {
    return await this.changeRequestsService.createMaterialRevision(id, dto, req.user.id);
  }

  @Post(':id/revisions/:rev/decision')
  @Permissions('CHANGE_REQUESTS:APPROVE')
  async recordClientDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rev', ParseIntPipe) rev: number,
    @Body() dto: ClientDecisionDto,
    @Req() req: any,
  ) {
    return await this.changeRequestsService.recordClientDecision(
      id,
      rev,
      dto,
      undefined,
      req.user.id,
    );
  }

  @Post(':id/tasks')
  @Permissions('CHANGE_REQUESTS:MANAGE')
  async linkDeliveryTasks(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkCrTasksDto,
    @Req() req: any,
  ) {
    return await this.changeRequestsService.linkDeliveryTasks(id, dto, req.user.id);
  }

  @Delete(':id/tasks/:taskId')
  @Permissions('CHANGE_REQUESTS:MANAGE')
  async unlinkDeliveryTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return await this.changeRequestsService.unlinkDeliveryTask(id, taskId);
  }
}
