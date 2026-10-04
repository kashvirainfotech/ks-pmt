import { IsOptional, IsUUID, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductGoalCategory, ProductGoalStatus } from './create-product-goal.dto';
import { OutcomeVerdict } from './create-outcome-review.dto';

export class QueryProductGoalsDto {
  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional({ enum: ProductGoalStatus, description: 'Filter by goal status' })
  @IsEnum(ProductGoalStatus)
  @IsOptional()
  status?: ProductGoalStatus;

  @ApiPropertyOptional({ enum: ProductGoalCategory, description: 'Filter by category' })
  @IsEnum(ProductGoalCategory)
  @IsOptional()
  category?: ProductGoalCategory;

  @ApiPropertyOptional({ description: 'Search term for title, metric, or code' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}

export class QueryOutcomeReviewsDto {
  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional({ description: 'Filter by goal ID' })
  @IsUUID()
  @IsOptional()
  goal_id?: string;

  @ApiPropertyOptional({ description: 'Filter by version ID' })
  @IsUUID()
  @IsOptional()
  version_id?: string;

  @ApiPropertyOptional({ description: 'Filter by idea ID' })
  @IsUUID()
  @IsOptional()
  idea_id?: string;

  @ApiPropertyOptional({ enum: OutcomeVerdict, description: 'Filter by outcome verdict' })
  @IsEnum(OutcomeVerdict)
  @IsOptional()
  verdict?: OutcomeVerdict;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}
