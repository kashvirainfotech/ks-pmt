import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IsUUID } from '../../../common/validators/record-id';

export class CreateLeaveDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID for whom the leave is being recorded (defaults to requester if omitted)',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    example: 'ANNUAL',
    enum: ['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'],
    description: 'Type / category of absence',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'])
  leaveType: string;

  @ApiProperty({
    example: '2026-10-15',
    description: 'Inclusive start date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: '2026-10-16',
    description: 'Inclusive end date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    example: 2.0,
    default: 1.0,
    description: 'Calculated or specified days count (e.g. 0.5 for half-day, 2.0 for 2 days)',
  })
  @IsNumber()
  @Min(0.5)
  daysCount: number;

  @ApiPropertyOptional({
    example: 'Family vacation scheduled in advance',
    description: 'Optional justification or note for the absence',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
