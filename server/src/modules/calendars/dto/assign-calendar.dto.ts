import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { IsUUID } from '../../../common/validators/record-id';

export class AssignCalendarDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID receiving calendar assignment',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: '5b123bc4-56de-78fa-90bc-def123456789',
    description: 'Working Calendar UUID to assign',
  })
  @IsUUID()
  @IsNotEmpty()
  calendarId: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'Inclusive effective starting date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Optional inclusive effective ending date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Custom working hours per day for part-time/contractor staff (overrides standard hours)',
  })
  @IsNumber()
  @Min(0.5)
  @Max(24)
  @IsOptional()
  customHoursPerDay?: number;

  @ApiPropertyOptional({
    example: 40.0,
    default: 40.0,
    description: 'Target billable hours per week for utilization metrics',
  })
  @IsNumber()
  @Min(0)
  @Max(80)
  @IsOptional()
  billableTargetHoursPerWeek?: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Flag designating whether the resource is an external contractor / vendor',
  })
  @IsBoolean()
  @IsOptional()
  isContractor?: boolean;

  @ApiPropertyOptional({
    example: 'Part-time contractor scheduled for 20 hours/week frontend assistance',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
