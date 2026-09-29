import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSavedViewDto {
  @ApiProperty({ description: 'Display name for the saved view' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  viewName: string;

  @ApiPropertyOptional({
    description: 'Target entity type',
    enum: ['TASK', 'DEFECT', 'SPRINT', 'PROJECT', 'PORTFOLIO', 'MY_WORK'],
    default: 'TASK',
  })
  @IsOptional()
  @IsIn(['TASK', 'DEFECT', 'SPRINT', 'PROJECT', 'PORTFOLIO', 'MY_WORK'])
  entityType?: 'TASK' | 'DEFECT' | 'SPRINT' | 'PROJECT' | 'PORTFOLIO' | 'MY_WORK';

  @ApiPropertyOptional({
    description: 'Sharing scope',
    enum: ['PERSONAL', 'TEAM', 'PROJECT', 'GLOBAL'],
    default: 'PERSONAL',
  })
  @IsOptional()
  @IsIn(['PERSONAL', 'TEAM', 'PROJECT', 'GLOBAL'])
  scope?: 'PERSONAL' | 'TEAM' | 'PROJECT' | 'GLOBAL';

  @ApiPropertyOptional({ description: 'Associated project ID (if scoped to project/team)' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Associated product ID' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Whether this view is the user default' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether this view is marked as favorite/pinned' })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ description: 'Lucide icon identifier' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color theme token' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Saved filter criteria object' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Saved columns configuration' })
  @IsOptional()
  columns?: any[];

  @ApiPropertyOptional({ description: 'Saved sorting configuration' })
  @IsOptional()
  sort?: any[];

  @ApiPropertyOptional({ description: 'Group by field name' })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional({
    description: 'View display mode',
    enum: ['LIST', 'KANBAN', 'CALENDAR', 'TIMELINE'],
    default: 'LIST',
  })
  @IsOptional()
  @IsIn(['LIST', 'KANBAN', 'CALENDAR', 'TIMELINE'])
  viewMode?: 'LIST' | 'KANBAN' | 'CALENDAR' | 'TIMELINE';
}
