import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';

export enum WipLimitType {
  STAGE = 'STAGE',
  USER = 'USER',
  TEAM = 'TEAM',
  PROJECT = 'PROJECT',
}

export enum WipEnforcementMode {
  SOFT_WARNING = 'SOFT_WARNING',
  HARD_GUARD = 'HARD_GUARD',
}

export class CreateWipLimitDto {
  @IsOptional()
  @IsString()
  limit_code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WipLimitType)
  limit_type: WipLimitType;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsUUID()
  team_id?: string;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsUUID()
  status_id?: string;

  @IsInt()
  @Min(1)
  max_wip_count: number;

  @IsOptional()
  @IsEnum(WipEnforcementMode)
  enforcement_mode?: WipEnforcementMode;
}
