import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class InstantiateProjectTemplateDto {
  @IsDateString()
  @IsNotEmpty()
  anchorStartDate: string; // ISO date e.g. "2026-10-01"

  @IsString()
  @IsNotEmpty()
  projectCode: string;

  @IsString()
  @IsNotEmpty()
  projectName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsUUID()
  @IsOptional()
  projectManagerId?: string;
}

export class InstantiateTaskTemplateDto {
  @IsDateString()
  @IsNotEmpty()
  anchorStartDate: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  milestoneId?: string;

  @IsUUID()
  @IsOptional()
  sprintId?: string;

  @IsUUID()
  @IsOptional()
  responsibleTeamId?: string;

  @IsUUID()
  @IsOptional()
  assigneeUserId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;
}
