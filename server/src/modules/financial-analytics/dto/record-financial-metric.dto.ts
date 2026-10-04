import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class RecordFinancialMetricDto {
  @IsUUID()
  @IsNotEmpty()
  project_id: string;

  @IsUUID()
  @IsOptional()
  baseline_id?: string;

  @IsString()
  @IsNotEmpty()
  period_label: string;

  @IsDateString()
  @IsNotEmpty()
  period_start: string;

  @IsDateString()
  @IsNotEmpty()
  period_end: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budgeted_hours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  actual_logged_hours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  approved_billable_hours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unapproved_draft_hours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remaining_hours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  eac_hours?: number;

  @IsNumber()
  @IsOptional()
  effort_variance_hours?: number;

  @IsNumber()
  @IsOptional()
  budget_consumption_pct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  total_recognized_revenue?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  total_direct_cost?: number;

  @IsNumber()
  @IsOptional()
  direct_contribution?: number;

  @IsNumber()
  @IsOptional()
  contribution_margin_pct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  burn_rate_hours_per_week?: number;

  @IsDateString()
  @IsOptional()
  projected_completion_date?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
