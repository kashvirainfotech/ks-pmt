import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsDateString } from 'class-validator';

export class CreateWipOverrideExceptionDto {
  @IsOptional()
  @IsUUID()
  wip_limit_id?: string;

  @IsUUID()
  @IsNotEmpty()
  task_id: string;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsUUID()
  team_id?: string;

  @IsOptional()
  @IsUUID()
  status_id?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsBoolean()
  is_expedited?: boolean;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
