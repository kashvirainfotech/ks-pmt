import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryTimesheetDto {
  @ApiPropertyOptional({ description: 'Target user UUID (defaults to current user)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Start date of the week (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter timesheets by status',
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
  })
  @IsOptional()
  @IsIn(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by project UUID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
