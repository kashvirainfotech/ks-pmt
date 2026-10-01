import { ParseUUIDPipe } from '../../common/validators/record-id';
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  RegisterPushTokenDto,
  DeregisterPushTokenDto,
} from './dto/register-push-token.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';
import { WatchEntityDto, UnwatchEntityDto } from './dto/watcher.dto';
import { EnqueueNotificationDto, QueryQueueDto } from './dto/queue.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ==========================================
  // In-App Notifications & Tokens
  // ==========================================

  @Post('push-token')
  async registerPushToken(
    @CurrentUser() user: any,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notificationsService.registerPushToken(user.id, dto);
  }

  @Delete('push-token')
  async deregisterPushToken(
    @CurrentUser() user: any,
    @Body() dto: DeregisterPushTokenDto,
  ) {
    return this.notificationsService.deregisterPushToken(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationsService.findAllForUser(user.id, query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // ==========================================
  // COLLAB-003: User Notification Preferences & Quiet Hours
  // ==========================================

  @Get('settings')
  @Permissions('NOTIFICATIONS:PREFERENCES')
  async getSettings(@CurrentUser() user: any) {
    return this.notificationsService.getSettings(user.id);
  }

  @Put('settings')
  @Permissions('NOTIFICATIONS:PREFERENCES')
  async updateSettings(
    @CurrentUser() user: any,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(user.id, dto);
  }

  // ==========================================
  // COLLAB-003: Work Item Watchers & Followers
  // ==========================================

  @Post('watchers/watch')
  @Permissions('NOTIFICATIONS:WATCH')
  async watchEntity(
    @CurrentUser() user: any,
    @Body() dto: WatchEntityDto,
  ) {
    return this.notificationsService.watchEntity(user.id, dto);
  }

  @Post('watchers/unwatch')
  @Permissions('NOTIFICATIONS:WATCH')
  async unwatchEntity(
    @CurrentUser() user: any,
    @Body() dto: UnwatchEntityDto,
  ) {
    return this.notificationsService.unwatchEntity(user.id, dto);
  }

  @Get('watchers/entity/:entityType/:entityId')
  @Permissions('NOTIFICATIONS:WATCH')
  async getEntityWatchers(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.notificationsService.getEntityWatchers(entityType.toUpperCase(), entityId);
  }

  @Get('watchers/my')
  @Permissions('NOTIFICATIONS:WATCH')
  async getMyWatchedItems(@CurrentUser() user: any) {
    return this.notificationsService.getMyWatchedItems(user.id);
  }

  // ==========================================
  // COLLAB-003: Delivery Queue & Digest Dispatch Engine
  // ==========================================

  @Post('queue/enqueue')
  @Permissions('NOTIFICATIONS:DISPATCH_QUEUE')
  async enqueueNotification(
    @CurrentUser() user: any,
    @Body() dto: EnqueueNotificationDto,
  ) {
    return this.notificationsService.enqueueNotification(user.id, dto);
  }

  @Post('queue/dispatch')
  @Permissions('NOTIFICATIONS:DISPATCH_QUEUE')
  async processDeliveryQueue(@CurrentUser() user: any) {
    return this.notificationsService.processDeliveryQueue(user.id);
  }

  @Get('queue')
  @Permissions('NOTIFICATIONS:DISPATCH_QUEUE')
  async getDeliveryQueue(@Query() query: QueryQueueDto) {
    return this.notificationsService.getDeliveryQueue(query);
  }

  @Get('digest/preview')
  @Permissions('NOTIFICATIONS:PREFERENCES')
  async previewDigest(@CurrentUser() user: any) {
    return this.notificationsService.previewDigest(user.id);
  }
}
