import { IsUUID } from '../../../common/validators/record-id';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class MapProductClientDto {
  @ApiProperty({
    example: '77777777-7777-7777-7777-777777777771',
    description: 'Client UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({
    example: 'SAAS_SUBSCRIPTION',
    enum: [
      'SAAS_SUBSCRIPTION',
      'ON_PREMISE_PERPETUAL',
      'ANNUAL_LEASE',
      'RENTAL',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['SAAS_SUBSCRIPTION', 'ON_PREMISE_PERPETUAL', 'ANNUAL_LEASE', 'RENTAL'])
  licenseType: string;

  @ApiProperty({
    example: 120000.0,
    description: 'License / subscription contract value',
  })
  @IsNumber()
  @Min(0)
  contractValue: number;

  @ApiPropertyOptional({
    example: 21600.0,
    default: 0.0,
    description: 'Annual AMC charge',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amcAmount?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({
    example: '2026-10-01',
    description: 'License start date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  licenseStartDate: string;

  @ApiPropertyOptional({
    example: '2027-09-30',
    description: 'License end date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  licenseEndDate?: string;

  @ApiPropertyOptional({
    example: '2027-09-01',
    description: 'Upcoming AMC renewal reminder date',
  })
  @IsDateString()
  @IsOptional()
  amcRenewalDate?: string;

  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'EXPIRED', 'PENDING_RENEWAL', 'TERMINATED'],
    default: 'ACTIVE',
  })
  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRED', 'PENDING_RENEWAL', 'TERMINATED'])
  status?: string;

  @ApiPropertyOptional({
    example: 'Includes cloud hosting and Tier 2 priority support',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supportTier?: string;
}
