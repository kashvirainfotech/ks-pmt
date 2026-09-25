import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryTimeLogDto {
  @ApiPropertyOptional({ example: '2026-10-01', description: 'Start date filter (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'End date filter (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by specific Task UUID' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Filter by User UUID (for managers)' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Page limit' })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  page?: number;
}
