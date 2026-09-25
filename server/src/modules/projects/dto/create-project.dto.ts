import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'PRJ-FINTECH-02', description: 'Unique project code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  projectCode: string;

  @ApiProperty({ example: 'NextGen Payment Gateway Integration', description: 'Project name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  projectName: string;

  @ApiPropertyOptional({ example: 'Complete integration of multi-currency acquiring rails' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '77777777-7777-7777-7777-777777777771', description: 'Client UUID' })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111', description: 'Branch UUID executing the project' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001', description: 'Project Manager User UUID' })
  @IsUUID()
  @IsNotEmpty()
  projectManagerUserId: string;

  @ApiProperty({
    example: 'FIXED_COST',
    enum: ['FIXED_COST', 'TIME_AND_MATERIAL', 'RETAINER'],
    description: 'Billing model for custom development services',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['FIXED_COST', 'TIME_AND_MATERIAL', 'RETAINER'])
  billingType: string;

  @ApiPropertyOptional({ example: 850000.00, default: 0.00, description: 'Captured project contract amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  contractAmount?: number;

  @ApiPropertyOptional({ example: 1200.00, default: 0.00, description: 'Hourly billing rate (used for T&M)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 650.00, default: 0.00, description: 'Estimated budget hours' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetedHours?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({ example: '2027-01-31' })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @ApiPropertyOptional({
    example: 'PLANNING',
    enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
    default: 'PLANNING',
  })
  @IsString()
  @IsOptional()
  @IsIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
  projectStatus?: string;
}
