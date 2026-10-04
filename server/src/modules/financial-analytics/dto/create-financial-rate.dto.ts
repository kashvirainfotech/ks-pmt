import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateFinancialRateDto {
  @IsString()
  @IsNotEmpty()
  rate_code: string;

  @IsUUID()
  @IsOptional()
  project_id?: string;

  @IsUUID()
  @IsOptional()
  role_id?: string;

  @IsUUID()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  hourly_billing_rate: number;

  @IsNumber()
  @Min(0)
  hourly_cost_rate: number;

  @IsDateString()
  @IsNotEmpty()
  effective_start_date: string;

  @IsDateString()
  @IsOptional()
  effective_end_date?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
