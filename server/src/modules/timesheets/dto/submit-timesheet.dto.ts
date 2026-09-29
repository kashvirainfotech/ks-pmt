import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitTimesheetDto {
  @ApiPropertyOptional({ description: 'Optional summary notes for the weekly timesheet submission' })
  @IsOptional()
  @IsString()
  submissionNotes?: string;

  @ApiPropertyOptional({ description: 'Optimistic revision check number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedRevision?: number;
}
