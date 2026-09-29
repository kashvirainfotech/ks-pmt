import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { CreateHandoffDto } from './dto/create-handoff.dto';
import {
  AcknowledgeHandoffDto,
  CompleteHandoffDto,
  RedirectHandoffDto,
  ReturnHandoffDto,
  StartHandoffWorkDto,
} from './dto/handoff-actions.dto';
import { HandoffsService } from './handoffs.service';

@Controller('handoffs')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class HandoffsController {
  constructor(private readonly handoffsService: HandoffsService) {}

  @Post()
  @Permissions('HANDOFFS:CREATE')
  async createHandoff(@Body() dto: CreateHandoffDto, @Req() req: any) {
    return await this.handoffsService.createHandoff(dto, req.user.id);
  }

  @Get('waiting-for-me')
  @Permissions('HANDOFFS:READ')
  async getWaitingForMe(@Req() req: any) {
    return await this.handoffsService.getWaitingForMe(req.user.id);
  }

  @Get('waiting-for-others')
  @Permissions('HANDOFFS:READ')
  async getWaitingForOthers(@Req() req: any) {
    return await this.handoffsService.getWaitingForOthers(req.user.id);
  }

  @Get('analytics')
  @Permissions('HANDOFFS:READ')
  async getAnalytics(@Query('teamId') teamId?: string) {
    return await this.handoffsService.getHandoffAnalytics(teamId);
  }

  @Get('tasks/:taskId')
  @Permissions('HANDOFFS:READ')
  async getTaskHandoffHistory(@Param('taskId') taskId: string) {
    return await this.handoffsService.getTaskHandoffHistory(taskId);
  }

  @Get(':id')
  @Permissions('HANDOFFS:READ')
  async getHandoffById(@Param('id') id: string) {
    return await this.handoffsService.getHandoffById(id);
  }

  @Post(':id/acknowledge')
  @Permissions('HANDOFFS:ACKNOWLEDGE')
  async acknowledgeHandoff(
    @Param('id') id: string,
    @Body() dto: AcknowledgeHandoffDto,
    @Req() req: any,
  ) {
    return await this.handoffsService.acknowledgeHandoff(id, dto, req.user.id);
  }

  @Post(':id/start-work')
  @Permissions('HANDOFFS:ACKNOWLEDGE')
  async startWork(
    @Param('id') id: string,
    @Body() dto: StartHandoffWorkDto,
    @Req() req: any,
  ) {
    return await this.handoffsService.startWork(id, dto, req.user.id);
  }

  @Post(':id/return')
  @Permissions('HANDOFFS:MANAGE')
  async returnForRework(
    @Param('id') id: string,
    @Body() dto: ReturnHandoffDto,
    @Req() req: any,
  ) {
    return await this.handoffsService.returnForRework(id, dto, req.user.id);
  }

  @Post(':id/redirect')
  @Permissions('HANDOFFS:MANAGE')
  async redirectHandoff(
    @Param('id') id: string,
    @Body() dto: RedirectHandoffDto,
    @Req() req: any,
  ) {
    return await this.handoffsService.redirectHandoff(id, dto, req.user.id);
  }

  @Post(':id/complete')
  @Permissions('HANDOFFS:ACKNOWLEDGE')
  async completeHandoff(
    @Param('id') id: string,
    @Body() dto: CompleteHandoffDto,
    @Req() req: any,
  ) {
    return await this.handoffsService.completeHandoff(id, dto, req.user.id);
  }
}
