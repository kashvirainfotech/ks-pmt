import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'PRD-ERP-01', description: 'Unique product code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  productCode: string;

  @ApiProperty({ example: 'KashCare Health ERP', description: 'Software product name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productName: string;

  @ApiPropertyOptional({ example: 'Comprehensive hospital & clinic management system' })
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

  @ApiPropertyOptional({ example: 450000.00, default: 0.00, description: 'Base license amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  baseLicensePrice?: number;

  @ApiPropertyOptional({ example: 18.00, default: 18.00, description: 'Standard annual maintenance charge percentage' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  standardAmcPercentage?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000001', description: 'Product Manager User UUID' })
  @IsUUID()
  @IsOptional()
  productManagerUserId?: string;
}
