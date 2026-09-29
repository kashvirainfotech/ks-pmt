import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkUpdateTaskItemDto {
  @ApiProperty({ description: 'Task UUID' })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Optimistic concurrency revision number for conflict detection' })
  @IsInt()
  @Min(1)
  expectedRevision: number;

  @ApiPropertyOptional({ description: 'Target workflow status UUID' })
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional({
    description: 'Target priority',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'],
  })
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'])
  priority?: string;

  @ApiPropertyOptional({ description: 'List of assignee user UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];

  @ApiPropertyOptional({ description: 'Target Sprint UUID or null to clear sprint' })
  @IsOptional()
  sprintId?: string | null;

  @ApiPropertyOptional({ description: 'Target Milestone UUID or null to clear milestone' })
  @IsOptional()
  milestoneId?: string | null;

  @ApiPropertyOptional({ description: 'Numeric story points' })
  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @ApiPropertyOptional({ description: 'T-shirt size estimate', example: 'M' })
  @IsOptional()
  @IsString()
  tShirtSize?: string;

  @ApiPropertyOptional({ description: 'Planned due date string' })
  @IsOptional()
  @IsString()
  plannedDueDate?: string;

  @ApiPropertyOptional({ description: 'Resolution classification' })
  @IsOptional()
  @IsIn(['FIXED', 'WONT_FIX', 'DUPLICATE', 'CANNOT_REPRODUCE', 'BY_DESIGN'])
  resolution?: string;

  @ApiPropertyOptional({ description: 'Resolution explanation' })
  @IsOptional()
  @IsString()
  resolutionDetails?: string;

  @ApiPropertyOptional({ description: 'Blocker flag' })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}

export class BulkUpdateTasksDto {
  @ApiProperty({ type: [BulkUpdateTaskItemDto], description: 'List of task updates to perform' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateTaskItemDto)
  items: BulkUpdateTaskItemDto[];

  @ApiPropertyOptional({ description: 'Optional audit remarks for this bulk update operation' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export interface BulkUpdateResultItem {
  id: string;
  taskCode?: string;
  title?: string;
}

export interface BulkUpdateFailedItem extends BulkUpdateResultItem {
  code: 'REVISION_CONFLICT' | 'INVALID_TRANSITION' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'VALIDATION_ERROR';
  reason: string;
}

export interface BulkUpdateTasksResponse {
  total: number;
  succeededCount: number;
  failedCount: number;
  succeeded: BulkUpdateResultItem[];
  failed: BulkUpdateFailedItem[];
}
