import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateIntakeRequestDto {
  @ApiProperty({
    enum: ['BUG', 'SUPPORT', 'CHANGE_REQUEST'],
    example: 'BUG',
  })
  @IsEnum(['BUG', 'SUPPORT', 'CHANGE_REQUEST'])
  @IsNotEmpty()
  requestType: 'BUG' | 'SUPPORT' | 'CHANGE_REQUEST';

  @ApiProperty({ example: 'Payment gateway timeout on checkout' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'When completing card payment, request times out after 30 seconds.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  @IsOptional()
  clientPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

  @ApiPropertyOptional({
    enum: [
      'OPERATIONS',
      'REVENUE',
      'COMPLIANCE',
      'SECURITY',
      'USABILITY',
      'PERFORMANCE',
      'REPORTING',
      'OTHER',
    ],
    default: 'OPERATIONS',
  })
  @IsEnum([
    'OPERATIONS',
    'REVENUE',
    'COMPLIANCE',
    'SECURITY',
    'USABILITY',
    'PERFORMANCE',
    'REPORTING',
    'OTHER',
  ])
  @IsOptional()
  businessImpact?:
    | 'OPERATIONS'
    | 'REVENUE'
    | 'COMPLIANCE'
    | 'SECURITY'
    | 'USABILITY'
    | 'PERFORMANCE'
    | 'REPORTING'
    | 'OTHER' = 'OPERATIONS';

  @ApiPropertyOptional({
    enum: [
      'INTERNAL',
      'SINGLE_USER',
      'ORGANIZATION',
      'MULTIPLE_CLIENTS',
      'ALL_CLIENTS',
    ],
    default: 'SINGLE_USER',
  })
  @IsEnum([
    'INTERNAL',
    'SINGLE_USER',
    'ORGANIZATION',
    'MULTIPLE_CLIENTS',
    'ALL_CLIENTS',
  ])
  @IsOptional()
  impactBreadth?:
    | 'INTERNAL'
    | 'SINGLE_USER'
    | 'ORGANIZATION'
    | 'MULTIPLE_CLIENTS'
    | 'ALL_CLIENTS' = 'SINGLE_USER';

  @ApiPropertyOptional({ description: 'Target Project ID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Target Product ID' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Target Component ID' })
  @IsUUID()
  @IsOptional()
  componentId?: string;

  @ApiPropertyOptional({
    description: 'Technical environment metadata (OS, browser, device, error text, correlation ID)',
  })
  @IsObject()
  @IsOptional()
  environmentDetails?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Uploaded attachment metadata stored in S3',
    type: 'array',
  })
  @IsArray()
  @IsOptional()
  attachments?: Array<{
    s3Key: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
}
