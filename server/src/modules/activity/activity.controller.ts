import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { QueryActivityDto } from './dto/query-activity.dto';
import { CreateBaselineDto } from './dto/create-baseline.dto';
import { SaveActivityQueryDto } from './dto/saved-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/validators/record-id';

@Controller('activity')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('what-changed')
  @Permissions('ACTIVITY:READ')
  async getWhatChanged(
    @CurrentUser() user: any,
    @Query() query: QueryActivityDto,
  ) {
    return this.activityService.getWhatChangedSummary(user.id, query);
  }

  @Get('baselines')
  @Permissions('ACTIVITY:READ')
  async getBaselines(
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.activityService.getBaselines(scopeType, scopeId);
  }

  @Post('baselines')
  @Permissions('ACTIVITY:BASELINES')
  async createBaseline(
    @CurrentUser() user: any,
    @Body() dto: CreateBaselineDto,
  ) {
    return this.activityService.createBaseline(user.id, dto);
  }

  @Get('saved-queries')
  @Permissions('ACTIVITY:READ')
  async getSavedQueries(@CurrentUser() user: any) {
    return this.activityService.getSavedQueries(user.id);
  }

  @Post('saved-queries')
  @Permissions('ACTIVITY:READ')
  async saveQuery(
    @CurrentUser() user: any,
    @Body() dto: SaveActivityQueryDto,
  ) {
    return this.activityService.saveQuery(user.id, dto);
  }

  @Delete('saved-queries/:id')
  @Permissions('ACTIVITY:READ')
  async deleteSavedQuery(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activityService.deleteSavedQuery(user.id, id);
  }
}
