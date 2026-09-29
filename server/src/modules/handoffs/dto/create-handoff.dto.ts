import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export enum HandoffType {
  BA_TO_DEV = 'BA_TO_DEV',
  DEV_TO_REVIEW = 'DEV_TO_REVIEW',
  DEV_TO_QA = 'DEV_TO_QA',
  QA_TO_DEV_REWORK = 'QA_TO_DEV_REWORK',
  DEV_TO_UAT = 'DEV_TO_UAT',
  CLIENT_REVIEW = 'CLIENT_REVIEW',
  GENERAL = 'GENERAL',
}

export class CreateHandoffDto {
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @IsUUID()
  @IsOptional()
  fromTeamId?: string;

  @IsUUID()
  @IsOptional()
  toTeamId?: string;

  @IsUUID()
  @IsOptional()
  toUserId?: string;

  @IsString()
  @IsOptional()
  handoffType?: string;

  @IsString()
  @IsOptional()
  requiredContext?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
