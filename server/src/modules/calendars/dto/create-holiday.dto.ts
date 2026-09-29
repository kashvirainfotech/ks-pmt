import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsUUID } from '../../../common/validators/record-id';

export class CreateHolidayDto {
  @ApiProperty({
    example: '5b123bc4-56de-78fa-90bc-def123456789',
    description: 'Working Calendar UUID to which this holiday applies',
  })
  @IsUUID()
  @IsNotEmpty()
  calendarId: string;

  @ApiProperty({
    example: 'Republic Day',
    description: 'Name/Title of the public holiday or company day off',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  holidayName: string;

  @ApiProperty({
    example: '2026-01-26',
    description: 'Date of the holiday (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  holidayDate: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Whether this holiday recurs annually on the same calendar month/day',
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    example: 'National holiday observed across all branch locations',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
