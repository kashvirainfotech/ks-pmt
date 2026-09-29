import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsUUID } from '../../../common/validators/record-id';

export class CreateCalendarDto {
  @ApiProperty({
    example: 'CAL-CORP-STD',
    description: 'Unique identifier code for the calendar',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  calendarCode: string;

  @ApiProperty({
    example: 'Corporate Standard Working Calendar',
    description: 'Human readable display name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  calendarName: string;

  @ApiPropertyOptional({
    example: 'c2e28a50-61d0-4bf2-a39c-f22ff61d40c0',
    description: 'Optional branch ID this calendar is tied to',
  })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    example: 'Asia/Kolkata',
    default: 'Asia/Kolkata',
    description: 'IANA Timezone name for shift scheduling',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    example: 8.0,
    default: 8.0,
    description: 'Standard working hours expected per active day',
  })
  @IsNumber()
  @Min(0.5)
  @Max(24)
  @IsOptional()
  standardHoursPerDay?: number;

  @ApiPropertyOptional({
    example: '1111100',
    default: '1111100',
    description: '7-character binary mask from Mon to Sun (1=working, 0=off)',
  })
  @IsString()
  @Matches(/^[01]{7}$/, {
    message: 'workingDaysMask must be a 7-character string of 0s and 1s representing Mon-Sun',
  })
  @IsOptional()
  workingDaysMask?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Whether this serves as the global corporate fallback calendar',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: 'Corporate HQ shift schedule covering Monday through Friday 9:30 AM to 6:30 PM',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
