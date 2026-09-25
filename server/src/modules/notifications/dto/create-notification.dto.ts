import { IsNotEmpty, IsUUID, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsUUID()
  recipientUserId: string;

  @IsNotEmpty()
  @IsString()
  notificationType: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsBoolean()
  isPushSent?: boolean;

  @IsOptional()
  @IsBoolean()
  isEmailSent?: boolean;
}
