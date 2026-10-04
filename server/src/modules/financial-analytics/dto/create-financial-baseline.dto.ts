import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateFinancialBaselineDto {
  @IsUUID()
  @IsNotEmpty()
  project_id: string;

  @IsString()
  @IsNotEmpty()
  baseline_code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  baseline_date?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgeted_hours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgeted_cost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgeted_revenue?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  scope_tasks_count?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  scope_story_points?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  warning_threshold_pct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  critical_threshold_pct?: number;

  @IsBoolean()
  @IsOptional()
  is_frozen?: boolean;
}
