import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsInt, Min, IsUUID } from 'class-validator';

export class CreateFlowAgingConfigDto {
  @IsOptional()
  @IsString()
  config_code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsUUID()
  team_id?: string;

  @IsOptional()
  @IsUUID()
  task_type_id?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsUUID()
  status_id?: string;

  @IsNumber()
  @Min(0)
  warning_threshold_hours: number;

  @IsNumber()
  @Min(0)
  critical_threshold_hours: number;

  @IsEnum(['BUSINESS_HOURS', 'ELAPSED_HOURS'])
  time_basis: 'BUSINESS_HOURS' | 'ELAPSED_HOURS';

  @IsOptional()
  @IsUUID()
  calendar_id?: string;

  @IsOptional()
  @IsInt()
  precedence_rank?: number;
}
