import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductGoalCategory {
  ADOPTION = 'ADOPTION',
  PERFORMANCE = 'PERFORMANCE',
  REVENUE_GROWTH = 'REVENUE_GROWTH',
  QUALITY_RELIABILITY = 'QUALITY_RELIABILITY',
  USER_SATISFACTION = 'USER_SATISFACTION',
  STRATEGIC = 'STRATEGIC',
}

export enum ProductGoalStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  ACHIEVED = 'ACHIEVED',
  MISSED = 'MISSED',
  ABANDONED = 'ABANDONED',
}

export class CreateProductGoalDto {
  @ApiProperty({ description: 'Target software product ID' })
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @ApiProperty({ description: 'Goal title', example: 'Enterprise Multi-GST Onboarding Adoption' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Goal detailed narrative / context' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: ProductGoalCategory,
    description: 'Goal business category',
    example: ProductGoalCategory.ADOPTION,
  })
  @IsEnum(ProductGoalCategory)
  @IsNotEmpty()
  category: ProductGoalCategory;

  @ApiProperty({ description: 'Measurable metric name', example: 'Active Customer E-Invoice Adoption Rate' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  metric_name: string;

  @ApiProperty({
    description: 'Unit of measurement (e.g. PERCENT, MILLISECONDS, COUNT, CURRENCY, SCORE)',
    example: 'PERCENT',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  metric_unit: string;

  @ApiProperty({ description: 'Starting / baseline metric value', example: 42.5 })
  @IsNumber()
  @Min(0)
  baseline_value: number;

  @ApiProperty({ description: 'Target goal metric value to achieve', example: 85.0 })
  @IsNumber()
  target_value: number;

  @ApiPropertyOptional({ description: 'Current observed metric value', example: 42.5, default: 0 })
  @IsNumber()
  @IsOptional()
  current_value?: number;

  @ApiProperty({ description: 'Target evaluation date (YYYY-MM-DD)', example: '2026-11-30' })
  @IsDateString()
  @IsNotEmpty()
  target_date: string;

  @ApiPropertyOptional({ description: 'Assigned goal owner user ID' })
  @IsUUID()
  @IsOptional()
  owner_user_id?: string;

  @ApiPropertyOptional({
    enum: ProductGoalStatus,
    description: 'Current goal execution status',
    default: ProductGoalStatus.IN_PROGRESS,
  })
  @IsEnum(ProductGoalStatus)
  @IsOptional()
  status?: ProductGoalStatus;
}
