import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum DigestMode {
  INSTANT = 'INSTANT',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  @IsOptional()
  @IsEnum(DigestMode)
  digestMode?: DigestMode;

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  allowUrgentDuringQuietHours?: boolean;

  @IsOptional()
  @IsObject()
  eventPreferences?: Record<string, boolean>;
}
