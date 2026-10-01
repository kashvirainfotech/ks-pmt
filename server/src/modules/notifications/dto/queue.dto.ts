import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class EnqueueNotificationDto {
  @IsNotEmpty()
  @IsString()
  deduplicationKey: string;

  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @IsOptional()
  @IsUUID()
  recipientContactId?: string;

  @IsOptional()
  @IsString()
  deliveryChannel?: string; // 'IN_APP', 'EMAIL', 'PUSH'

  @IsNotEmpty()
  @IsString()
  eventCategory: string; // 'TASK_ASSIGNMENT', 'STATUS_CHANGE', 'COMMENT_AND_MENTION', etc.

  @IsNotEmpty()
  @IsString()
  eventTitle: string;

  @IsOptional()
  @IsString()
  eventSummary?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  entityCode?: string;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsString()
  scheduledFor?: string;
}

export class QueryQueueDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  eventCategory?: string;

  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
