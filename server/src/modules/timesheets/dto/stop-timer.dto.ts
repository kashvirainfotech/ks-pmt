import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StopTimerDto {
  @ApiPropertyOptional({ description: 'Work accomplishments summary for the logged time entry' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Worklog date (YYYY-MM-DD), defaults to today' })
  @IsOptional()
  @IsDateString()
  logDate?: string;

  @ApiPropertyOptional({ description: 'Whether the logged time is billable' })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;
}
