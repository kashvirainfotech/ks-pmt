import { PartialType } from '@nestjs/swagger';
import { CreateProductGoalDto } from './create-product-goal.dto';
import { IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductGoalStatus } from './create-product-goal.dto';

export class UpdateProductGoalDto extends PartialType(CreateProductGoalDto) {
  @ApiPropertyOptional({ description: 'Updated current metric value', example: 78.5 })
  @IsNumber()
  @IsOptional()
  current_value?: number;

  @ApiPropertyOptional({
    enum: ProductGoalStatus,
    description: 'Updated goal execution status',
  })
  @IsEnum(ProductGoalStatus)
  @IsOptional()
  status?: ProductGoalStatus;
}
