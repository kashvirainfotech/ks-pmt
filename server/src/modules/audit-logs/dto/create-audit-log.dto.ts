import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateAuditLogDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  actionType: string;

  @IsNotEmpty()
  @IsString()
  entityName: string;

  @IsOptional()
  @IsUUID()
  recordId?: string;

  @IsOptional()
  oldValues?: any;

  @IsOptional()
  newValues?: any;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  devicePlatform?: string;

  @IsOptional()
  @IsString()
  locationCoordinates?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
