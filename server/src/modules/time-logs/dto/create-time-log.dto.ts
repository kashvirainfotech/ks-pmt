import { IsUUID } from '../../../common/validators/record-id';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class CreateTimeLogDto {
  @ApiProperty({
    example: '4a123bc4-56de-78fa-90bc-def123456789',
    description: 'Task UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({
    example: '2026-10-02',
    description: 'Date of effort spent (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  logDate: string;

  @ApiProperty({
    example: 3.5,
    description: 'Duration in hours (e.g. 1.5, 3.5)',
  })
  @IsNumber()
  @Min(1 / 60)
  @Max(24)
  hoursSpent: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether this effort is billable to the client',
  })
  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;

  @ApiProperty({
    example:
      'Configured Stripe signature validation and handled webhook retries',
    description: 'Work accomplishment summary',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: '2026-10-02T09:30:00Z',
    description:
      'Timer start timestamp (if recorded via mobile/web live timer)',
  })
  @IsDateString()
  @IsOptional()
  timerStartTime?: string;

  @ApiPropertyOptional({
    example: '2026-10-02T13:00:00Z',
    description: 'Timer stop timestamp',
  })
  @IsDateString()
  @IsOptional()
  timerEndTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOvertime?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isWeekend?: boolean;
}
