import { IsUUID } from '../../../common/validators/record-id';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateVersionDto {
  @ApiProperty({
    example: 'v2.5.0',
    description: 'Semantic version or sprint code (e.g. v1.0.0, Sprint 4)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  versionCode: string;

  @ApiPropertyOptional({ example: 'Payment Gateway Revamp Release' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  versionName?: string;

  @ApiPropertyOptional({
    example: 'Changelog: Stripe webhook integration, refund automation',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'PROJECT', enum: ['PRODUCT', 'PROJECT'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['PRODUCT', 'PROJECT'])
  entityType: string;

  @ApiPropertyOptional({
    example: '55555555-5555-5555-5555-555555555551',
    description: 'Required if entityType is PRODUCT',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    example: '99999999-9999-9999-9999-999999999991',
    description: 'Required if entityType is PROJECT',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsDateString()
  @IsOptional()
  targetReleaseDate?: string;

  @ApiPropertyOptional({
    example: 'PLANNING',
    enum: [
      'PLANNING',
      'IN_PROGRESS',
      'CODE_FREEZE',
      'RELEASED',
      'DEPRECATED',
      'ARCHIVED',
    ],
    default: 'PLANNING',
  })
  @IsString()
  @IsOptional()
  @IsIn([
    'PLANNING',
    'IN_PROGRESS',
    'CODE_FREEZE',
    'RELEASED',
    'DEPRECATED',
    'ARCHIVED',
  ])
  status?: string;
}
