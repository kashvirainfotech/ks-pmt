import { IsUUID } from '../../../common/validators/record-id';
import {
  IsObject as ExtraObject,
  IsNumber as ExtraNumber,
  Min as ExtraMin,
  IsIn as ExtraIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'PRD-ERP-01', description: 'Unique product code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  productCode: string;

  @ApiProperty({
    example: 'KashCare Health ERP',
    description: 'Software product name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productName: string;

  @ApiPropertyOptional({
    example: 'Comprehensive hospital & clinic management system',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Healthcare SaaS' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'v2.4.0' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  currentVersion?: string;

  @ApiPropertyOptional({
    example: 450000.0,
    default: 0.0,
    description: 'Base license amount',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  baseLicensePrice?: number;

  @ApiPropertyOptional({
    example: 18.0,
    default: 18.0,
    description: 'Standard annual maintenance charge percentage',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  standardAmcPercentage?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Product Manager User UUID',
  })
  @IsUUID()
  @IsOptional()
  productManagerUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  techStack?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentationLinks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subscriptionPlans?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ExtraNumber()
  @ExtraMin(0)
  implementationFee?: number;
}
