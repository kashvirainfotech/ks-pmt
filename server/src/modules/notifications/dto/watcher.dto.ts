import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class WatchEntityDto {
  @IsNotEmpty()
  @IsString()
  entityType: string; // 'TASK', 'KNOWLEDGE_DOC', 'PRODUCT_IDEA', 'CHANGE_REQUEST', 'UAT_PACKAGE'

  @IsNotEmpty()
  @IsUUID()
  entityId: string;

  @IsOptional()
  @IsUUID()
  clientContactId?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnStatusChange?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnComments?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnAttachments?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnApprovals?: boolean;
}

export class UnwatchEntityDto {
  @IsNotEmpty()
  @IsString()
  entityType: string;

  @IsNotEmpty()
  @IsUUID()
  entityId: string;

  @IsOptional()
  @IsUUID()
  clientContactId?: string;
}
